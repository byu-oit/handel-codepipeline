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

const handel = require('../../common/handel');


function getBuildProjectName(phaseContext) {
    return `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`;
}

function createBuildPhaseServiceRole(accountConfig, appName, extraPolicies) {
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
                    let policy = JSON.parse(compiledPolicyDoc);
                    policy.Statement = policy.Statement.concat(extraPolicies);
                    return iamCalls.createPolicyIfNotExists(roleName, policyArn, policy);
                });
        })
        .then(policy => {
            return iamCalls.attachPolicyToRole(policy.Arn, roleName);
        })
        .then(policyAttachment => {
            return iamCalls.getRole(roleName);
        });
}

function createBuildPhaseCodeBuildProject(phaseContext, extras) {
    let appName = phaseContext.appName;
    let buildProjectName = getBuildProjectName(phaseContext);
    let buildImage = phaseContext.params.build_image;

    if (buildImage && buildImage.startsWith('<account>')) {
        let imageNameAndTag = buildImage.substring(9);
        buildImage = `${phaseContext.accountConfig.account_id}.dkr.ecr.${phaseContext.accountConfig.region}.amazonaws.com${imageNameAndTag}`;
    }

    let envVars = Object.assign({}, phaseContext.params.environment_variables, extras.environmentVariables);

    return createBuildPhaseServiceRole(phaseContext.accountConfig, appName, extras.policies)
        .then(buildPhaseRole => {
            return codeBuildCalls.getProject(buildProjectName)
                .then(buildProject => {
                    if (!buildProject) {
                        winston.info(`Creating build phase CodeBuild project ${buildProjectName}`);
                        return codeBuildCalls.createProject(buildProjectName, appName, buildImage, envVars, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region);
                    }
                    else {
                        winston.info(`Updating build phase CodeBuild project ${buildProjectName}`);
                        return codeBuildCalls.updateProject(buildProjectName, appName, buildImage, envVars, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region)
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

    if (phaseConfig.extra_resources) {
        let extraErrors = handel.check(phaseConfig.extra_resources);
        extraErrors.map(error => {
            return 'CodeBuild - extra_resources - ' + error;
        }).forEach(error => errors.push(error));
    }

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.createPhase = function (phaseContext, accountConfig) {
    return createExtraResources(phaseContext, accountConfig)
        .then(extraResults => {
            return createBuildPhaseCodeBuildProject(phaseContext, extraResults)
        })
        .then(codeBuildProject => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    let codeBuildProjectName = getBuildProjectName(phaseContext);
    winston.info(`Deleting CodeBuild project '${codeBuildProjectName}'`);

    let deleteExtras = Promise.resolve(true);
    if (phaseContext.params && phaseContext.params.extra_resources) {
        deleteExtras = handel.delete(phaseContext.params.extra_resources, phaseContext, accountConfig);
    }
    return deleteExtras.then(() => {
        return codeBuildCalls.deleteProject(codeBuildProjectName);
    });
}

function createExtraResources(phaseContext, accountConfig) {
    let extras = phaseContext.params.extra_resources;
    if (!extras) {
        return Promise.resolve({
            policies: [],
            environmentVariables: {}
        });
    }
    return handel.deploy(extras, phaseContext, accountConfig);
}

