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
import { AccountConfig } from 'handel/src/datatypes';
import * as winston from 'winston';
import * as codeBuildCalls from '../../aws/codebuild-calls';
import { getPipelineProjectName } from '../../aws/codepipeline-calls';
import * as iamCalls from '../../aws/iam-calls';
import * as util from '../../common/util';
import { PhaseConfig, PhaseContext, PhaseSecretQuestion, PhaseSecrets } from '../../datatypes/index';

export interface HandelConfig extends PhaseConfig {
    environments_to_deploy: string[];
}

function getDeployProjectName(phaseContext: PhaseContext<HandelConfig>): string {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

const DEPLOY_PHASE_ROLE_NAME = 'HandelCodePipelineDeployPhaseServiceRole';

function getDeployServiceRolePolicyArn(accountId: string): string {
    return `arn:aws:iam::${accountId}:policy/handel-codepipeline/${DEPLOY_PHASE_ROLE_NAME}`;
}

async function createDeployPhaseServiceRole(accountId: string): Promise<AWS.IAM.Role | null> {
    const policyArn = getDeployServiceRolePolicyArn(accountId);
    const policyDocument = util.loadJsonFile(`${__dirname}/deploy-phase-service-policy.json`);
    return iamCalls.createOrUpdateRoleAndPolicy(DEPLOY_PHASE_ROLE_NAME, ['codebuild.amazonaws.com'], policyArn, policyDocument);
}

async function createDeployPhaseCodeBuildProject(phaseContext: PhaseContext<HandelConfig>, accountConfig: AccountConfig): Promise<AWS.CodeBuild.Project> {
    const {appName, pipelineName, phaseName} = phaseContext;
    const deployProjectName = getDeployProjectName(phaseContext);
    const deployPhaseRole = await createDeployPhaseServiceRole(phaseContext.accountConfig.account_id);
    if(!deployPhaseRole) {
        throw new Error(`Could not get newly created deploy phase role`);
    }

    const handelDeployEnvVars = {
        ENVS_TO_DEPLOY: phaseContext.params.environments_to_deploy.join(','),
        HANDEL_ACCOUNT_CONFIG: new Buffer(JSON.stringify(accountConfig)).toString('base64'),
        PIPELINE_NAME: getPipelineProjectName(appName, pipelineName)
    };
    const handelDeployImage = 'aws/codebuild/standard:2.0';
    const buildSpecPath = `${__dirname}/deploy-buildspec.yml`;
    const handelDeployBuildSpec = util.loadFile(buildSpecPath);
    if(!handelDeployBuildSpec) {
        throw new Error(`Could not load build spec file from ${buildSpecPath}`);
    }

    const buildProject = await codeBuildCalls.getProject(deployProjectName);
    if (!buildProject) {
        winston.info(`Creating Handel deploy phase CodeBuild project ${deployProjectName}`);
        return codeBuildCalls.createProject({
            projectName: deployProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: handelDeployImage,
            environmentVariables: handelDeployEnvVars,
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: deployPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: handelDeployBuildSpec
        });
    }
    else {
        winston.info(`Updating Handel deploy phase CodeBuild project ${deployProjectName}`);
        return codeBuildCalls.updateProject({
            projectName: deployProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: handelDeployImage,
            environmentVariables: handelDeployEnvVars,
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: deployPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: handelDeployBuildSpec
        });
    }
}

function getCodePipelinePhaseSpec(phaseContext: PhaseContext<HandelConfig>): AWS.CodePipeline.StageDeclaration {
    return {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_Build`
                    }
                ],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: 'Test',
                    owner: 'AWS',
                    version: '1',
                    provider: 'CodeBuild'
                },
                configuration: {
                    ProjectName: getDeployProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: HandelConfig): string[] {
    const errors: string[] = [];

    if (!phaseConfig.environments_to_deploy) {
        errors.push(`GitHub - The 'environments_to_deploy' parameter is required`);
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: HandelConfig): Promise<PhaseSecrets> {
    return Promise.resolve({});
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    return [];
}

export async function deployPhase(phaseContext: PhaseContext<HandelConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    const codeBuildProject = await createDeployPhaseCodeBuildProject(phaseContext, accountConfig);
    return getCodePipelinePhaseSpec(phaseContext);
}

export async function deletePhase(phaseContext: PhaseContext<HandelConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const codeBuildProjectName = getDeployProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    await codeBuildCalls.deleteProject(codeBuildProjectName);
    return true;
}
