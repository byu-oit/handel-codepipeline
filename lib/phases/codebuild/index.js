const iamCalls = require('../../aws/iam-calls');
const codeBuildCalls = require('../../aws/codebuild-calls');
const winston = require('winston');
const util = require('../../util/util');

function getBuildProjectName(appName) {
    return `${appName}-build`;
}

function createBuildPhaseServiceRole(accountConfig, appName) {
    let roleName = `${appName}-HandelCodePipelineBuildPhase`;
    return iamCalls.createRoleIfNotExists(roleName, 'codebuild.amazonaws.com')
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
    let buildProjectName = getBuildProjectName(appName);

    return createBuildPhaseServiceRole(phaseContext.accountConfig, appName)
        .then(buildPhaseRole => {
            return codeBuildCalls.getProject(buildProjectName)
                .then(buildProject => {
                    if (!buildProject) {
                        winston.info(`Creating build phase CodeBuild project ${appName}`);
                        return codeBuildCalls.createProject(buildProjectName, appName, phaseContext.params.build_image, phaseContext.params.environment_variables, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region);
                    }
                    else {
                        winston.info(`Updating build phase CodeBuild project ${appName}`);
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
                    ProjectName: getBuildProjectName(phaseContext.appName)
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
    winston.info(`Delete CodeBuild project for '${phaseContext.phaseName}'`);
    let codeBuildProjectName = getBuildProjectName(phaseContext.appName);
    return codeBuildCalls.deleteProject(codeBuildProjectName);
}