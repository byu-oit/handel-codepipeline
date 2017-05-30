const iamCalls = require('../../aws/iam-calls');
const codeBuildCalls = require('../../aws/codebuild-calls');
const winston = require('winston');
const util = require('../../util/util');

function getBuildProjectName(handelFileName) {
    return `${handelFileName}-build`;
}

function createBuildPhaseServiceRole(accountConfig, handelAppName) {
    let roleName = `${handelAppName}-HandelCodePipelineBuildPhase`;
    return iamCalls.createRoleIfNotExists(roleName, 'codebuild.amazonaws.com')
        .then(role => {
            let policyArn = `arn:aws:iam::${accountConfig.account_id}:policy/handel-codepipeline/${roleName}`;
            let policyDocParams = {
                region: accountConfig.region,
                accountId: accountConfig.account_id,
                appName: handelAppName
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
    let handelAppName = phaseContext.handelAppName;
    winston.info(`Creating build phase CodeBuild project ${handelAppName}`);

    let buildProjectName = getBuildProjectName(handelAppName);

    return createBuildPhaseServiceRole(phaseContext.accountConfig, handelAppName)
        .then(buildPhaseRole => {
            return codeBuildCalls.createProject(buildProjectName, handelAppName, phaseContext.params.build_image, phaseContext.params.environment_variables, phaseContext.accountConfig.account_id, buildPhaseRole.Arn, phaseContext.accountConfig.region);
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
                    ProjectName: getBuildProjectName(phaseContext.handelAppName)
                },
                runOrder: 1
            }
        ]
    }
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