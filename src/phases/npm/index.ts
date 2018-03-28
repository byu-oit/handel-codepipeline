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
import * as inquirer from 'inquirer';
import * as winston from 'winston';
import * as codeBuildCalls from '../../aws/codebuild-calls';
import * as iamCalls from '../../aws/iam-calls';
import * as ssmCalls from '../../aws/ssm-calls';
import * as util from '../../common/util';
import { PhaseConfig, PhaseContext, PhaseSecretQuestion, PhaseSecrets } from '../../datatypes';

export interface NpmConfig extends PhaseConfig {
    build_image: string;
}

function getNpmProjectName(phaseContext: PhaseContext<NpmConfig>): string {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

function getNpmParameterPrefix(phaseContext: PhaseContext<NpmConfig>): string {
    return `${phaseContext.appName}.${phaseContext.pipelineName}`;
}

function getNpmTokenName(phaseContext: PhaseContext<NpmConfig>): string {
    const prefix = getNpmParameterPrefix(phaseContext);
    return `${prefix}.npmToken`;
}

function getNpmPhaseRoleName(appName: string): string {
    return `${appName}-HandelCodePipelineNPMPhase`;
}

function getNpmPhasePolicyArn(accountId: string, appName: string): string {
    return `arn:aws:iam::${accountId}:policy/handel-codepipeline/${getNpmPhaseRoleName(appName)}`;
}

async function createNpmPhaseServiceRole(accountConfig: AccountConfig, appName: string): Promise<AWS.IAM.Role | null> {
    const roleName = getNpmPhaseRoleName(appName);
    const policyArn = getNpmPhasePolicyArn(accountConfig.account_id, appName);
    const policyDocParams = {
        region: accountConfig.region,
        accountId: accountConfig.account_id,
        appName: appName
    };
    const compiledPolicyDoc = await util.compileHandlebarsTemplate(`${__dirname}/npm-phase-service-policy.json`, policyDocParams);
    return iamCalls.createOrUpdateRoleAndPolicy(roleName, ['codebuild.amazonaws.com'], policyArn, compiledPolicyDoc);
}

async function deleteNpmPhaseServiceRole(accountId: string, appName: string): Promise<boolean> {
    const roleName = getNpmPhaseRoleName(appName);
    const policyArn = getNpmPhasePolicyArn(accountId, appName);
    await iamCalls.detachPolicyFromRole(roleName, policyArn);
    await iamCalls.deletePolicy(policyArn);
    await iamCalls.deleteRole(roleName);
    return true;
}

async function createNpmPhaseCodeBuildProject(phaseContext: PhaseContext<NpmConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const {appName, pipelineName, phaseName} = phaseContext;
    const npmProjectName = getNpmProjectName(phaseContext);
    const npmPhaseRole = await createNpmPhaseServiceRole(phaseContext.accountConfig, appName);
    if(!npmPhaseRole) {
        throw new Error(`Couldn't create NPM phase role`);
    }
    const npmDeployImage = phaseContext.params.build_image || 'aws/codebuild/nodejs:6.3.1';
    const buildspecParams = {'parameter_prefix': `${appName}.${pipelineName}`};
    const npmDeployBuildSpec = await util.compileHandlebarsTemplate(`${__dirname}/npm-buildspec.yml`, buildspecParams);
    const buildProject = await codeBuildCalls.getProject(npmProjectName);
    if (!buildProject) {
        winston.info(`Creating NPM deploy phase CodeBuild project ${npmProjectName}`);
        await codeBuildCalls.createProject({
            projectName: npmProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: npmDeployImage,
            environmentVariables: {},
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: npmPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: npmDeployBuildSpec
        });
    }
    else {
        winston.info(`Updating NPM deploy phase CodeBuild project ${npmProjectName}`);
        await codeBuildCalls.updateProject({
            projectName: npmProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: npmDeployImage,
            environmentVariables: {},
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: npmPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: npmDeployBuildSpec
        });
    }
    const paramName = getNpmTokenName(phaseContext);
    const paramType = 'SecureString';
    const paramValue = phaseContext.secrets.npmToken;
    const paramDesc = `NPM token for pipeline`;
    await ssmCalls.putParameter(paramName, paramType, paramValue, paramDesc);
    return true;
}

function getCodePipelinePhaseSpec(phaseContext: PhaseContext<NpmConfig>): AWS.CodePipeline.StageDeclaration {
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
                    ProjectName: getNpmProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: NpmConfig): string[] {
    return []; // No required parameters
}

export function getSecretsForPhase(phaseConfig: NpmConfig): Promise<PhaseSecrets> {
    return inquirer.prompt(getQuestions(phaseConfig));
}

function getQuestions(phaseConfig: PhaseConfig) {
    return [
        {
            type: 'input',
            name: 'npmToken',
            message: `${phaseConfig.name}' phase - Please enter your NPM Token`
        }
    ];
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    const questions = getQuestions(phaseConfig);
    const result: PhaseSecretQuestion[] = [];
    questions.forEach((question) => {
        result.push({
            phaseName: phaseConfig.name,
            name: question.name,
            message: question.message
        });
    });
    return result;
}

export async function deployPhase(phaseContext: PhaseContext<NpmConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    await createNpmPhaseCodeBuildProject(phaseContext, accountConfig);
    return getCodePipelinePhaseSpec(phaseContext);
}

export async function deletePhase(phaseContext: PhaseContext<NpmConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const codeBuildProjectName = getNpmProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    await codeBuildCalls.deleteProject(codeBuildProjectName);
    await ssmCalls.deleteParameter(getNpmTokenName(phaseContext));
    await deleteNpmPhaseServiceRole(accountConfig.account_id, phaseContext.appName);
    return true;
}
