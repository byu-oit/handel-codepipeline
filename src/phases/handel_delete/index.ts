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
import * as  winston from 'winston';
import * as codeBuildCalls from '../../aws/codebuild-calls';
import * as iamCalls from '../../aws/iam-calls';
import * as util from '../../common/util';
import { PhaseConfig, PhaseContext, PhaseSecrets } from '../../datatypes/index';

export interface HandelDeleteConfig extends PhaseConfig {
    environments_to_delete: string[];
}

function getDeleteProjectName(phaseContext: PhaseContext<HandelDeleteConfig>): string {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

const DELETE_PHASE_ROLE_NAME = 'HandelCodePipelineDeletePhaseServiceRole';

function getDeleteServiceRoleArn(accountId: number): string {
    return `arn:aws:iam::${accountId}:policy/handel-codepipeline/${DELETE_PHASE_ROLE_NAME}`;
}

async function createDeletePhaseServiceRole(accountId: number): Promise<AWS.IAM.Role | null> {
    const roleName = DELETE_PHASE_ROLE_NAME;
    const role = await iamCalls.createRoleIfNotExists(roleName, ['codebuild.amazonaws.com']);
    const policyArn = getDeleteServiceRoleArn(accountId);
    const policyDocument = util.loadJsonFile(`${__dirname}/delete-phase-service-policy.json`);
    const policy = await iamCalls.createPolicyIfNotExists(roleName, policyArn, policyDocument);
    const policyAttachment = await iamCalls.attachPolicyToRole(policy!.Arn, roleName);
    return iamCalls.getRole(roleName);
}

async function createDeletePhaseCodeBuildProject(phaseContext: PhaseContext<HandelDeleteConfig>, accountConfig: AccountConfig): Promise<AWS.CodeBuild.Project> {
    const {appName, pipelineName, phaseName} = phaseContext;
    const deleteProjectName = getDeleteProjectName(phaseContext);
    const deletePhaseRole = await createDeletePhaseServiceRole(phaseContext.accountConfig.account_id);
    if(!deletePhaseRole) {
        throw new Error(`Could not create Handel delete phase role`);
    }
    const handelDeleteEnvVars = {
        ENVS_TO_DELETE: phaseContext.params.environments_to_delete.join(','),
        HANDEL_ACCOUNT_CONFIG: new Buffer(JSON.stringify(accountConfig)).toString('base64')
    };
    const handelDeleteImage = 'aws/codebuild/nodejs:6.3.1';
    const handelDeleteBuildSpecPath = `${__dirname}/delete-buildspec.yml`;
    const handelDeleteBuildSpec = util.loadFile(handelDeleteBuildSpecPath);
    if(!handelDeleteBuildSpec) {
        throw new Error(`Could not load Handel delete phase build spec from ${handelDeleteBuildSpecPath}`);
    }

    const buildProject = await codeBuildCalls.getProject(deleteProjectName);
    if (!buildProject) {
        winston.info(`Creating Handel delete phase CodeBuild project ${deleteProjectName}`);
        return codeBuildCalls.createProject(deleteProjectName, appName, pipelineName, phaseName, handelDeleteImage, handelDeleteEnvVars, phaseContext.accountConfig.account_id.toString(), deletePhaseRole.Arn, phaseContext.accountConfig.region, handelDeleteBuildSpec);
    }
    else {
        winston.info(`Updating Handel delete phase CodeBuild project ${deleteProjectName}`);
        return codeBuildCalls.updateProject(deleteProjectName, appName, pipelineName, phaseName, handelDeleteImage, handelDeleteEnvVars, phaseContext.accountConfig.account_id.toString(), deletePhaseRole.Arn, phaseContext.accountConfig.region, handelDeleteBuildSpec);
    }
}

function getCodePipelinePhaseSpec(phaseContext: PhaseContext<HandelDeleteConfig>): AWS.CodePipeline.StageDeclaration {
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
                    ProjectName: getDeleteProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: HandelDeleteConfig): string[] {
    const errors: string[] = [];

    if (!phaseConfig.environments_to_delete) {
        errors.push(`GitHub - The 'environments_to_delete' parameter is required`);
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: HandelDeleteConfig): Promise<PhaseSecrets> {
    return Promise.resolve({});
}

export async function deployPhase(phaseContext: PhaseContext<HandelDeleteConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    const codeBuildProject = await createDeletePhaseCodeBuildProject(phaseContext, accountConfig);
    return getCodePipelinePhaseSpec(phaseContext);
}

export async function deletePhase(phaseContext: PhaseContext<HandelDeleteConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const codeBuildProjectName = getDeleteProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    await codeBuildCalls.deleteProject(codeBuildProjectName);
    return true;
}
