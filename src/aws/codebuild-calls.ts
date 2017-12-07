/*
 * Copyright 2017 Brigham Young University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import * as AWS from 'aws-sdk';
import awsWrapper from './aws-wrapper';

function getCodeBuildEnvVarDef(key: string, value: string): AWS.CodeBuild.EnvironmentVariable {
    return {
        name: key,
        value: value
    };
}

const CREATE_RETRY_TIMEOUT_SECONDS = 5;
const MAX_CREATE_RETRIES = 120 / CREATE_RETRY_TIMEOUT_SECONDS; //try for about 2 minutes

function createCodeBuildProject(createParams: any): AWS.CodeBuild.CreateProjectOutput {
    const deferred: any = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    let tries = 0;

    function createProjectRec() {
        awsWrapper.codeBuild.createProject(createParams)
            .then(projectResponse => {
                deferred.resolve(projectResponse);
            })
            .catch(err => {
                tries++;
                if (err.code === 'InvalidInputException' && tries < MAX_CREATE_RETRIES) { // Try again because the IAM role isn't available yet
                    setTimeout(() => {
                        createProjectRec();
                    }, CREATE_RETRY_TIMEOUT_SECONDS * 1000);
                }
                else {
                    deferred.reject(err);
                }
            });
    }

    createProjectRec();

    return deferred.promise;
}

export interface ProjectInput {
    projectName: string;
    appName: string;
    pipelineName: string;
    phaseName: string;
    imageName: string;
    environmentVariables: any;
    accountId: string;
    serviceRoleArn: string;
    region: string;
    cacheSpec?: CacheSpecification;
    buildSpec?: string;
}

function getProjectParams(parameters: ProjectInput): AWS.CodeBuild.CreateProjectInput {
    let {projectName, appName, pipelineName, phaseName, imageName, environmentVariables, accountId, serviceRoleArn, region, cacheSpec, buildSpec} = parameters;

    const projectParams: AWS.CodeBuild.Types.CreateProjectInput = {
        name: projectName,
        description: projectName,
        source: {
            type: 'CODEPIPELINE'
        },
        artifacts: {
            type: 'CODEPIPELINE'
        },
        environment: {
            computeType: 'BUILD_GENERAL1_SMALL',
            image: imageName,
            type: 'LINUX_CONTAINER',
            environmentVariables: []
        },
        serviceRole: serviceRoleArn,
        tags: [
            {
                key: 'Name',
                value: projectName
            }
        ]
    };

    if (cacheSpec && cacheSpec.type === CacheType.S3) {
        projectParams.cache = {
            type: 'S3',
            location: cacheSpec.location
        };
    }

    // If using a custom image, set the build to use privilegedMode. Allows access to docker daemon for docker build
    // http://docs.aws.amazon.com/codebuild/latest/APIReference/API_ProjectEnvironment.html
    if (imageName.startsWith(accountId)) {
        projectParams.environment.privilegedMode = true;
    }

    // Override buildspec if specified
    if (buildSpec) {
        projectParams.source.buildspec = buildSpec;
    }

    // Inject pre-provided environment variables
    projectParams.environment.environmentVariables!.push(getCodeBuildEnvVarDef('AWS_ACCOUNT_ID', accountId.toString()));
    projectParams.environment.environmentVariables!.push(getCodeBuildEnvVarDef('AWS_REGION', region));
    projectParams.environment.environmentVariables!.push(getCodeBuildEnvVarDef('HANDEL_APP_NAME', appName));
    projectParams.environment.environmentVariables!.push(getCodeBuildEnvVarDef('HANDEL_PIPELINE_NAME', pipelineName));
    projectParams.environment.environmentVariables!.push(getCodeBuildEnvVarDef('HANDEL_PHASE_NAME', phaseName));

    // Add environment variables for codebuild project
    for (const envKey of Object.keys(environmentVariables)) {
        projectParams.environment.environmentVariables!.push(
            getCodeBuildEnvVarDef(envKey, environmentVariables[envKey])
        );
    }

    return projectParams;
}

export async function createProject(parameters: ProjectInput): Promise<AWS.CodeBuild.Project> {
    const projectParams = getProjectParams(parameters);

    const createResponse = await createCodeBuildProject(projectParams);
    return createResponse.project!;
}

export async function updateProject(parameters: ProjectInput): Promise<AWS.CodeBuild.Project> {
    const projectParams = getProjectParams(parameters);

    const updateResponse = await awsWrapper.codeBuild.updateProject(projectParams);
    return updateResponse.project!;
}

export async function getProject(projectName: string): Promise<AWS.CodeBuild.Project | null> {
    const getParams = {
        names: [
            projectName
        ]
    };
    const getResults = await awsWrapper.codeBuild.batchGetProjects(getParams);
    const projects = getResults.projects;
    if (projects && projects.length !== 0) {
        return projects[0];
    }
    else {
        return null; // No project
    }
}

export async function deleteProject(projectName: string): Promise<boolean> {
    const deleteParams = {
        name: projectName
    };
    await awsWrapper.codeBuild.deleteProject(deleteParams);
    return true;
}

export const enum CacheType {
    NO_CACHE = 'no-cache',
    S3 = 's3'
}

export class CacheSpecification {
    constructor(readonly type: CacheType, readonly location: string) {
    }
}
