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
import * as inquirer from 'inquirer';
import * as winston from 'winston';
import * as codeBuildCalls from '../../aws/codebuild-calls';
import * as iamCalls from '../../aws/iam-calls';
import * as ssmCalls from '../../aws/ssm-calls';
import * as util from '../../common/util';
import { PhaseConfig, PhaseContext, PhaseSecrets, PhaseSecretQuestion } from '../../datatypes';

export interface PypiConfig extends PhaseConfig {
    server: string;
    build_image: string;
}

function getPypiProjectName(phaseContext: PhaseContext<PypiConfig>): string {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

function getPypiParameterPrefix(phaseContext: PhaseContext<PypiConfig>): string {
    return `${phaseContext.appName}.${phaseContext.pipelineName}`;
}

function getPypiParameterNames(phaseContext: PhaseContext<PypiConfig>): string[] {
    const prefix = getPypiParameterPrefix(phaseContext);
    return [`${prefix}.twine_username`, `${prefix}.twine_password`, `${prefix}.twine_repo`];
}

async function createPypiParameters(phaseContext: PhaseContext<PypiConfig>): Promise<boolean> {
    const prefix = getPypiParameterPrefix(phaseContext);
    const params = [
        {
            name: `${prefix}.twine_username`,
            type: 'String',
            value: phaseContext.secrets.pypiUsername,
            description: `twine user name for pipeline ${prefix}`
        },
        {
            name: `${prefix}.twine_password`,
            type: 'SecureString',
            value: phaseContext.secrets.pypiPassword,
            description: `twine password for pipeline ${prefix}`
        },
        {
            name: `${prefix}.twine_repo`,
            type: 'String',
            value: phaseContext.params.server || 'pypi',
            description: `twine repo for pipeline ${prefix}`
        }
    ];

    const putPromises = [];

    for (const param of params) {
        putPromises.push(ssmCalls.putParameter(param.name, param.type, param.value, param.description));
    }

    await Promise.all(putPromises);
    return true;
}

function getPypiPhaseRoleName(appName: string): string {
    return `${appName}-HandelCodePipelinePyPiPhase`;
}

function getPypiPhasePolicyArn(accountId: number, appName: string): string {
    return `arn:aws:iam::${accountId}:policy/handel-codepipeline/${getPypiPhaseRoleName(appName)}`;
}

async function createPypiPhaseServiceRole(accountConfig: AccountConfig, appName: string): Promise<AWS.IAM.Role | null> {
    const roleName = getPypiPhaseRoleName(appName);
    const policyArn = getPypiPhasePolicyArn(accountConfig.account_id, appName);
    const policyDocParams = {
        region: accountConfig.region,
        accountId: accountConfig.account_id,
        appName: appName
    };
    const compiledPolicyDoc = await util.compileHandlebarsTemplate(`${__dirname}/pypi-phase-service-policy.json`, policyDocParams);
    return iamCalls.createOrUpdateRoleAndPolicy(roleName, ['codebuild.amazonaws.com'], policyArn, compiledPolicyDoc);
}

async function deletePypiPhaseServiceRole(accountId: number, appName: string): Promise<boolean> {
    const roleName = getPypiPhaseRoleName(appName);
    const policyArn = getPypiPhasePolicyArn(accountId, appName);
    await iamCalls.detachPolicyFromRole(roleName, policyArn);
    await iamCalls.deletePolicy(policyArn);
    await iamCalls.deleteRole(roleName);
    return true;
}

async function createPypiPhaseCodeBuildProject(phaseContext: PhaseContext<PypiConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const {appName, pipelineName, phaseName} = phaseContext;
    const pypiProjectName = getPypiProjectName(phaseContext);
    const buildspecParams = {
        'parameter_prefix': `${appName}.${pipelineName}`,
        'twine_repo_url': phaseContext.params.server
    };
    const pypiPhaseRole = await createPypiPhaseServiceRole(phaseContext.accountConfig, appName);
    if(!pypiPhaseRole) {
        throw new Error(`Could not create PyPi phase role`);
    }
    const pypiDeployImage = phaseContext.params.build_image || 'aws/codebuild/python:3.5.2';
    const pypiDeployBuildSpec = await util.compileHandlebarsTemplate(`${__dirname}/pypi-buildspec.yml`, buildspecParams);
    const buildProject = await codeBuildCalls.getProject(pypiProjectName);
    if (!buildProject) {
        winston.info(`Creating PyPi deploy phase CodeBuild project ${pypiProjectName}`);
        await codeBuildCalls.createProject({
            projectName: pypiProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: pypiDeployImage,
            environmentVariables: {},
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: pypiPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: pypiDeployBuildSpec
        });
    }
    else {
        winston.info(`Updating PyPi deploy phase CodeBuild project ${pypiProjectName}`);
        await codeBuildCalls.updateProject({
            projectName: pypiProjectName,
            appName: appName,
            pipelineName: pipelineName,
            phaseName: phaseName,
            imageName: pypiDeployImage,
            environmentVariables: {},
            accountId: phaseContext.accountConfig.account_id.toString(),
            serviceRoleArn: pypiPhaseRole.Arn,
            region: phaseContext.accountConfig.region,
            buildSpec: pypiDeployBuildSpec
        });
    }
    return createPypiParameters(phaseContext);
}

function getCodePipelinePhaseSpec(phaseContext: PhaseContext<PypiConfig>): AWS.CodePipeline.StageDeclaration {
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
                    ProjectName: getPypiProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: PypiConfig): string[] {
    return []; // No required parameters
}

export function getSecretsForPhase(phaseConfig: PypiConfig): Promise<PhaseSecrets> {
    return inquirer.prompt(getQuestions(phaseConfig));
}

function getQuestions(phaseConfig: PhaseConfig) {
    return [
        {
            type: 'input',
            name: 'pypiUsername',
            message: `'${phaseConfig.name}' phase - Please enter your PyPi username`,
        },
        {
            type: 'input',
            name: 'pypiPassword',
            message: `'${phaseConfig.name}' phase - Please enter your PyPi password`,
        }
    ];
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    const questions = getQuestions(phaseConfig);
    let result: PhaseSecretQuestion[] = [];
    questions.forEach((question) => {
        result.push({
            phaseName: phaseConfig.name,
            name: question.name,
            message: question.message
        });
    });
    return result;
}

export async function deployPhase(phaseContext: PhaseContext<PypiConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    await createPypiPhaseCodeBuildProject(phaseContext, accountConfig);
    return getCodePipelinePhaseSpec(phaseContext);
}

export async function deletePhase(phaseContext: PhaseContext<PypiConfig>, accountConfig: AccountConfig): Promise<boolean> {
    const codeBuildProjectName = getPypiProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    await codeBuildCalls.deleteProject(codeBuildProjectName);
    await ssmCalls.deleteParameters(getPypiParameterNames(phaseContext));
    await deletePypiPhaseServiceRole(accountConfig.account_id, phaseContext.appName);
    return true;
}
