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
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as winston from 'winston';
import * as codeBuildCalls from '../../aws/codebuild-calls';
import * as iamCalls from '../../aws/iam-calls';
import * as handel from '../../common/handel';
import * as util from '../../common/util';
import { EnvironmentVariables, PhaseConfig, PhaseContext, PhaseSecrets, PhaseSecretQuestion } from '../../datatypes/index';
import {CacheSpecification, CacheType} from "../../aws/codebuild-calls";

export interface CodeBuildConfig extends PhaseConfig {
    build_image: string;
    environment_variables?: EnvironmentVariables;
    build_role?: string;
    extra_resources?: HandelExtraResources;
    cache?: CacheType
}

export interface HandelExtraResources {
    [key: string]: {
        type: string;
        [key: string]: string;
    };
}

function getBuildProjectName(phaseContext: PhaseContext<CodeBuildConfig>): string {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

function getBuildPhaseRoleName(appName: string): string {
    return `${appName}-HandelCodePipelineBuildPhase`;
}

function getBuildPhasePolicyArn(accountId: number, appName: string): string {
    return `arn:aws:iam::${accountId}:policy/handel-codepipeline/${getBuildPhaseRoleName(appName)}`;
}

async function createBuildPhaseServiceRole(accountConfig: AccountConfig, appName: string, extraPolicies: any) {
    const roleName = getBuildPhaseRoleName(appName);
    const role = await iamCalls.createRoleIfNotExists(roleName, ['codebuild.amazonaws.com']);
    const policyArn = getBuildPhasePolicyArn(accountConfig.account_id, appName);
    const policyDocParams = {
        region: accountConfig.region,
        accountId: accountConfig.account_id,
        appName: appName
    };
    const compiledPolicyDoc = await util.compileHandlebarsTemplate(`${__dirname}/build-phase-service-policy.json`, policyDocParams);
    const policyDocObj = JSON.parse(compiledPolicyDoc);
    policyDocObj.Statement = policyDocObj.Statement.concat(extraPolicies);
    const policy = await iamCalls.createPolicyIfNotExists(roleName, policyArn, policyDocObj);
    const policyAttachment = await iamCalls.attachPolicyToRole(policy.Arn, roleName);
    return iamCalls.getRole(roleName);
}

async function deleteBuildPhaseServiceRole(accountId: number, appName: string) {
    const roleName = getBuildPhaseRoleName(appName);
    const policyArn = getBuildPhasePolicyArn(accountId, appName);
    await iamCalls.detachPolicyFromRole(roleName, policyArn);
    await iamCalls.deletePolicy(policyArn);
    await iamCalls.deleteRole(roleName);
    return true;
}

async function createBuildPhaseCodeBuildProject(phaseContext: PhaseContext<CodeBuildConfig>, extras: any): Promise<AWS.CodeBuild.Project> {
    const {appName, pipelineName, phaseName} = phaseContext;
    const buildProjectName = getBuildProjectName(phaseContext);
    let buildImage = phaseContext.params.build_image;

    if (buildImage && buildImage.startsWith('<account>')) {
        const imageNameAndTag = buildImage.substring(9);
        buildImage = `${phaseContext.accountConfig.account_id}.dkr.ecr.${phaseContext.accountConfig.region}.amazonaws.com${imageNameAndTag}`;
    }

    const envVars = Object.assign({}, phaseContext.params.environment_variables, extras.environmentVariables);

    let cacheSpec: CacheSpecification | undefined;
    const cacheSetting = phaseContext.params.cache;
    if (cacheSetting && cacheSetting === CacheType.S3) {
        cacheSpec = new CacheSpecification(CacheType.S3, getCacheLocation(phaseContext));
    }

    let buildPhaseRole;
    if (phaseContext.params.build_role) {
        buildPhaseRole = await lookupRole(phaseContext.params.build_role);
    } else {
        buildPhaseRole = await createBuildPhaseServiceRole(phaseContext.accountConfig, appName, extras.policies);
    }

    if(!buildPhaseRole) {
        throw new Error(`Couldn't create build phase service role`);
    }

    const buildProject = await codeBuildCalls.getProject(buildProjectName);
    if (!buildProject) {
        winston.info(`Creating build phase CodeBuild project ${buildProjectName}`);
        return codeBuildCalls.createProject({
            projectName: buildProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: buildImage,
            environmentVariables: envVars,
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: buildPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            cacheSpec: cacheSpec,
        });
    }
    else {
        winston.info(`Updating build phase CodeBuild project ${buildProjectName}`);
        return codeBuildCalls.updateProject({
            projectName: buildProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: buildImage,
            environmentVariables: envVars,
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: buildPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            cacheSpec: cacheSpec,
        });
    }
}

function getCacheLocation(phaseContext: PhaseContext<CodeBuildConfig>): string {
    const {codePipelineBucketName: bucket, appName, pipelineName, phaseName} = phaseContext;
    return `${bucket}/caches/${appName}/${pipelineName}/${phaseName}/codeBuildCache`
}

async function lookupRole(roleName: string): Promise<AWS.IAM.Role> {
    const result = await iamCalls.getRole(roleName);
    if (!result) {
        throw new Error(`No role named ${roleName} exists in this account`);
    }
    return result;
}

function getCodePipelinePhaseSpec(phaseContext: PhaseContext<CodeBuildConfig>): AWS.CodePipeline.StageDeclaration {
    return {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_Source`
                    }
                ],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: 'Build',
                    owner: 'AWS',
                    version: '1',
                    provider: 'CodeBuild'
                },
                outputArtifacts: [
                    {
                        name: `Output_Build`
                    }
                ],
                configuration: {
                    ProjectName: getBuildProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: CodeBuildConfig): string[] {
    const errors: string[] = [];

    if (!phaseConfig.build_image) {
        errors.push(`CodeBuild - The 'build_image' parameter is required`);
    }

    if (phaseConfig.extra_resources) {
        const extraErrors = handel.check(phaseConfig.extra_resources);
        extraErrors.map(error => {
            return 'CodeBuild - extra_resources - ' + error;
        }).forEach(error => errors.push(error));
    }

    if (phaseConfig.cache) {
        const cache = phaseConfig.cache;
        if (cache !== CacheType.S3 && cache !== CacheType.NO_CACHE) {
            errors.push(`CodeBuild - The 'cache' parameter must be either 's3' or 'no-cache'`)
        }
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: CodeBuildConfig): Promise<PhaseSecrets> {
    return Promise.resolve({});
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    return [];
}

export async function deployPhase(phaseContext: PhaseContext<CodeBuildConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    const extraResults = await createExtraResources(phaseContext, accountConfig);
    const codeBuildProject = await createBuildPhaseCodeBuildProject(phaseContext, extraResults);
    return getCodePipelinePhaseSpec(phaseContext);
}

export async function deletePhase(phaseContext: PhaseContext<CodeBuildConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const codeBuildProjectName = getBuildProjectName(phaseContext);
    winston.info(`Deleting CodeBuild project '${codeBuildProjectName}'`);

    if (phaseContext.params && phaseContext.params.extra_resources) {
        await handel.delete(phaseContext.params.extra_resources, phaseContext, accountConfig);
    }
    await codeBuildCalls.deleteProject(codeBuildProjectName);
    await deleteBuildPhaseServiceRole(accountConfig.account_id, phaseContext.appName);
    return true;
}

function createExtraResources(phaseContext: PhaseContext<CodeBuildConfig>, accountConfig: AccountConfig) {
    const extras = phaseContext.params.extra_resources;
    if (!extras) {
        return Promise.resolve({
            policies: [],
            environmentVariables: {}
        });
    }
    return handel.deploy(extras, phaseContext, accountConfig);
}
