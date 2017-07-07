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
const winston = require('winston');
const util = require('../../common/util');

function getBuildProjectName(phaseContext) {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

function createBuildPhaseServiceRole(accountConfig, appName) {
    let roleName = `${appName}-HandelCodePipelineBuildPhase`;
    return iamCalls.createRoleIfNotExists(roleName, ['codebuild.amazonaws.com'])
        .then(role => {
            let policyArn = `arn:aws:iam::${accountConfig.account_id}:policy/handel-codepipeline/${roleName}`;
            let policyDocParams = {
                region: accountConfig.region,
                accountId: accountConfig.account_id,
                appName: appName
            }
            return util.compileHandlebarsTemplate(`${__dirname}/build-phase-service-policy.json`, policyDocParams)
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

function createBuildPhaseCodeBuildProject(phaseContext) {
    let appName = phaseContext.appName;
    let buildProjectName = getBuildProjectName(phaseContext);

    return createBuildPhaseServiceRole(phaseContext.accountConfig, appName)
        .then(buildPhaseRole => {
            return codeBuildCalls.getProject(buildProjectName)
                .then(buildProject => {
                    if (!buildProject) {
                        winston.info(`Creating build phase CodeBuild project ${buildProjectName}`);
                        return codeBuildCalls.createProject(buildProjectName, appName, phaseContext.params.build_image, phaseContext.params.environment_variables, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region);
                    }
                    else {
                        winston.info(`Updating build phase CodeBuild project ${buildProjectName}`);
                        return codeBuildCalls.updateProject(buildProjectName, appName, phaseContext.params.build_image, phaseContext.params.environment_variables, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region)
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
                        name: `Output_Source`
                    }
                ],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Build",
                    owner: "AWS",
                    version: "1",
                    provider: "CodeBuild"
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
    }
}

exports.check = function (phaseConfig) {
    let errors = [];

    if (!phaseConfig.build_image) {
        errors.push(`CodeBuild - The 'build_image' parameter is required`);
    }

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.createPhase = function (phaseContext, accountConfig) {
    return createBuildPhaseCodeBuildProject(phaseContext)
        .then(codeBuildProject => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    let codeBuildProjectName = getBuildProjectName(phaseContext);
    winston.info(`Deleting CodeBuild project '${codeBuildProjectName}'`);
    return codeBuildCalls.deleteProject(codeBuildProjectName);
}