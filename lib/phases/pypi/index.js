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

function getPypiProjectName(phaseContext) {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`
}

function getPypiParameterNames(phaseContext) {
    return [`${phaseContext.appName}.twine_username`, `${phaseContext.appName}.twine_password`, `${phaseContext.appName}.twine_repo`]
}

function createPypiParameters(phaseContext) {
    let params = [
        {
            name: `${phaseContext.appName}.twine_username`,
            type: 'String',
            value: phaseContext.secrets.pypiUsername,
            description: `twine user name for pipeline ${phaseContext.appName}`
        },
        {
            name: `${phaseContext.appName}.twine_password`,
            type: 'SecureString',
            value: phaseContext.secrets.pypiPassword,
            description: `twine password for pipeline ${phaseContext.appName}`
        },
        {
            name: `${phaseContext.appName}.twine_repo`,
            type: 'String',
            value: phaseContext.params.server || 'pypi',
            description: `twine repo for pipeline ${phaseContext.appName}`
        }
    ];

    let putPromises = [];
    
    for (let param of params) {
        putPromises.push(ssmCalls.putParameter(param.name, param.type, param.value, param.description));
    }

    return Promise.all(putPromises);
}

function createPypiPhaseServiceRole(accountConfig, appName) {
    let roleName = `${appName}-HandelCodePipelinePyPiPhase`;
    return iamCalls.createRoleIfNotExists(roleName, ['codebuild.amazonaws.com'])
        .then(role => {
            let policyArn = `arn:aws:iam::${accountConfig.account_id}:policy/handel-codepipeline/${roleName}`;
            let policyDocParams = {
                region: accountConfig.region,
                accountId: accountConfig.account_id,
                appName: appName
            }
            return util.compileHandlebarsTemplate(`${__dirname}/pypi-phase-service-policy.json`, policyDocParams)
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

function createPypiPhaseCodeBuildProject(phaseContext, accountConfig) {
    let appName = phaseContext.appName;
    let pypiProjectName = getPypiProjectName(phaseContext)
    return createPypiPhaseServiceRole(phaseContext.accountConfig, appName)
        .then(pypiPhaseRole => {
            let pypiDeployImage = phaseContext.params.build_image || "aws/codebuild/python:3.5.2";
            let pypiDeployBuildSpec = util.loadFile(`${__dirname}/pypi-buildspec.yml`);

            return codeBuildCalls.getProject(pypiProjectName)
                .then(buildProject => {
                    if (!buildProject) {
                        winston.info(`Creating PyPi deploy phase CodeBuild project ${pypiProjectName}`);
                        return codeBuildCalls.createProject(pypiProjectName, appName, pypiDeployImage, {}, phaseContext.accountConfig.account_id, pypiPhaseRole.Arn, phaseContext.accountConfig.region, pypiDeployBuildSpec);
                    }
                    else {
                        winston.info(`Updating PyPi deploy phase CodeBuild project ${pypiProjectName}`);
                        return codeBuildCalls.updateProject(pypiProjectName, appName, pypiDeployImage, {}, phaseContext.accountConfig.account_id, pypiPhaseRole.Arn, phaseContext.accountConfig.region, pypiDeployBuildSpec)
                    }
                });
        })
        .then(() => {
            return createPypiParameters(phaseContext)
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
                    ProjectName: getPypiProjectName(phaseContext)
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

exports.getSecretsForPhase = function () {
    let questions = [
        {
            type: 'input',
            name: 'pypiUsername',
            message: 'Please enter your PyPi username',
        },
        {
            type: 'input',
            name: 'pypiPassword',
            message: 'Please enter your PyPi password',
        }
    ];
    return inquirer.prompt(questions);
}

exports.createPhase = function (phaseContext, accountConfig) {
    return createPypiPhaseCodeBuildProject(phaseContext, accountConfig)
        .then(() => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    let codeBuildProjectName = getPypiProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    return codeBuildCalls.deleteProject(codeBuildProjectName)
        .then(() => {
            return ssmCalls.deleteParameters(getPypiParameterNames(phaseContext));
        });
}