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
const codeBuildCalls = require('../../aws/codebuild-calls');
const util = require('../../util/util');
const winston = require('winston');

function getDeleteProjectName(phaseContext) {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`
}

function createDeletePhaseServiceRole(accountId) {
    let roleName = 'HandelCodePipelineDeletePhaseServiceRole'
    return iamCalls.createRoleIfNotExists(roleName, 'codebuild.amazonaws.com')
        .then(role => {
            let policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${roleName}`;
            let policyDocument = util.loadJsonFile(`${__dirname}/delete-phase-service-policy.json`);
            return iamCalls.createPolicyIfNotExists(roleName, policyArn, policyDocument);
        })
        .then(policy => {
            return iamCalls.attachPolicyToRole(policy.Arn, roleName);
        })
        .then(policyAttachment => {
            return iamCalls.getRole(roleName);
        });
}

function createDeletePhaseCodeBuildProject(phaseContext, accountConfig) {
    let appName = phaseContext.appName;
    let deleteProjectName = getDeleteProjectName(phaseContext)
    return createDeletePhaseServiceRole(phaseContext.accountConfig.account_id)
        .then(deletePhaseRole => {
            let handelDeleteEnvVars = {
                ENVS_TO_DELETE: phaseContext.params.environments_to_delete.join(","),
                HANDEL_ACCOUNT_CONFIG: new Buffer(JSON.stringify(accountConfig)).toString("base64")
            }
            let handelDeleteImage = "aws/codebuild/nodejs:6.3.1";
            let handelDeleteBuildSpec = util.loadFile(`${__dirname}/delete-buildspec.yml`);

            return codeBuildCalls.getProject(deleteProjectName)
                .then(buildProject => {
                    if (!buildProject) {
                        winston.info(`Creating Handel delete phase CodeBuild project ${deleteProjectName}`);
                        return codeBuildCalls.createProject(deleteProjectName, appName, handelDeleteImage, handelDeleteEnvVars, phaseContext.accountConfig.account_id, deletePhaseRole.Arn, phaseContext.accountConfig.region, handelDeleteBuildSpec);
                    }
                    else {
                        winston.info(`Updating Handel delete phase CodeBuild project ${deleteProjectName}`);
                        return codeBuildCalls.updateProject(deleteProjectName, appName, handelDeleteImage, handelDeleteEnvVars, phaseContext.accountConfig.account_id, deletePhaseRole.Arn, phaseContext.accountConfig.region, handelDeleteBuildSpec)
                    }
                });
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
                    ProjectName: getDeleteProjectName(phaseContext)
                },
                runOrder: 1
            }
        ]
    }
}

exports.check = function (phaseConfig) {
    let errors = [];

    if (!phaseConfig.environments_to_delete) {
        errors.push(`GitHub - The 'environments_to_delete' parameter is required`);
    }

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.createPhase = function (phaseContext, accountConfig) {
    return createDeletePhaseCodeBuildProject(phaseContext, accountConfig)
        .then(codeBuildProject => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    let codeBuildProjectName = getDeleteProjectName(phaseContext);
    winston.info(`Delete CodeBuild project for '${codeBuildProjectName}'`);
    return codeBuildCalls.deleteProject(codeBuildProjectName);
}