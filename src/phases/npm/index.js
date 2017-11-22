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
const iamCalls = require('../../aws/iam-calls');
const ssmCalls = require('../../aws/ssm-calls');
const codeBuildCalls = require('../../aws/codebuild-calls');
const util = require('../../common/util');
const winston = require('winston');
const inquirer = require('inquirer');

function getNpmProjectName(phaseContext) {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`
}

function getNpmParameterPrefix(phaseContext) {
    return `${phaseContext.appName}.${phaseContext.pipelineName}`
}

function getNpmTokenName(phaseContext) {
    let prefix = getNpmParameterPrefix(phaseContext)
    return `${prefix}.npmToken`
}

function createNpmPhaseServiceRole(accountConfig, appName) {
    let roleName = `${appName}-HandelCodePipelineNPMPhase`
    return iamCalls.createRoleIfNotExists(roleName, ['codebuild.amazonaws.com'])
        .then(role => {
            let policyArn = `arn:aws:iam::${accountConfig.account_id}:policy/handel-codepipeline/${roleName}`;
            let policyDocParams = {
                region: accountConfig.region,
                accountId: accountConfig.account_id,
                appName: appName
            }
            return util.compileHandlebarsTemplate(`${__dirname}/npm-phase-service-policy.json`, policyDocParams)
                .then(compiledPolicyDoc => {
                    return iamCalls.createPolicyIfNotExists(roleName, policyArn, JSON.parse(compiledPolicyDoc));
                });
        })
        .then(policy => {
            return iamCalls.attachPolicyToRole(policy.Arn, roleName);
        })
        .then(policyAttachment => {
            return iamCalls.getRole(roleName);
        });
}

function createNpmPhaseCodeBuildProject(phaseContext, accountConfig) {
    let {appName, pipelineName, phaseName} = phaseContext;
    let npmProjectName = getNpmProjectName(phaseContext)
    return createNpmPhaseServiceRole(phaseContext.accountConfig, appName)
        .then(npmPhaseRole => {
            let npmDeployImage = phaseContext.params.build_image || "aws/codebuild/nodejs:6.3.1";
            let buildspecParams = {"parameter_prefix": `${appName}.${pipelineName}`};
            return util.compileHandlebarsTemplate(`${__dirname}/npm-buildspec.yml`, buildspecParams)
                .then(npmDeployBuildSpec => {
                    return codeBuildCalls.getProject(npmProjectName)
                        .then(buildProject => {
                            if (!buildProject) {
                                winston.info(`Creating NPM deploy phase CodeBuild project ${npmProjectName}`);
                                return codeBuildCalls.createProject(npmProjectName, appName, pipelineName, phaseName, npmDeployImage, {}, phaseContext.accountConfig.account_id, npmPhaseRole.Arn, phaseContext.accountConfig.region, npmDeployBuildSpec);
                            }
                            else {
                                winston.info(`Updating NPM deploy phase CodeBuild project ${npmProjectName}`);
                                return codeBuildCalls.updateProject(npmProjectName, appName, pipelineName, phaseName, npmDeployImage, {}, phaseContext.accountConfig.account_id, npmPhaseRole.Arn, phaseContext.accountConfig.region, npmDeployBuildSpec)
                            }
                        });
                })
        })
        .then(() => {
            let paramName = getNpmTokenName(phaseContext)
            let paramType = 'SecureString'
            let paramValue = phaseContext.secrets.npmToken
            let paramDesc = `NPM token for pipeline`
            return ssmCalls.putParameter(paramName, paramType, paramValue, paramDesc)
        });
}

function getCodePipelinePhaseSpec(phaseContext) {
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
                    category: "Test",
                    owner: "AWS",
                    version: "1",
                    provider: "CodeBuild"
                },
                configuration: {
                    ProjectName: getNpmProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    }
}

exports.check = function (phaseConfig) {
    let errors = [];
    // No required Parameters
    return errors;
}

exports.getSecretsForPhase = function(phaseConfig) {
    let questions = [
        {
            type: 'input',
            name: 'npmToken',
            message: `${phaseConfig.name}' phase - Please enter your NPM Token`
        }
    ];
    return inquirer.prompt(questions);
}

exports.deployPhase = function (phaseContext, accountConfig) {
    return createNpmPhaseCodeBuildProject(phaseContext, accountConfig)
        .then(() => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    let codeBuildProjectName = getNpmProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    return codeBuildCalls.deleteProject(codeBuildProjectName)
        .then(() => {
            return ssmCalls.deleteParameter(getNpmTokenName(phaseContext));
        });
}