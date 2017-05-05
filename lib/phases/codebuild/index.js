const iamCalls = require('../../aws/iam-calls');
const codeBuildCalls = require('../../aws/codebuild-calls');
const winston = require('winston');
const inquirer = require('inquirer');

function createBuildPhaseServiceRole(accountId) {
    let roleName = 'HandelCodePipelineBuildPhaseServiceRole';
    return iamCalls.createRoleIfNotExists(roleName, 'codebuild.amazonaws.com')
        .then(role => {
            let policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${roleName}`;
            let policyDocument = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "codebuild:StartBuild",
                            "codebuild:StopBuild",
                            "codebuild:BatchGet*",
                            "codebuild:Get*",
                            "codebuild:List*",
                            "codecommit:GetBranch",
                            "codecommit:GetCommit",
                            "codecommit:GetRepository",
                            "codecommit:ListBranches",
                            "ecr:BatchCheckLayerAvailability",
                            "ecr:BatchGetImage",
                            "ecr:CompleteLayerUpload",
                            "ecr:DescribeImages",
                            "ecr:GetAuthorizationToken",
                            "ecr:GetDownloadUrlForLayer",
                            "ecr:InitiateLayerUpload",
                            "ecr:ListImages",
                            "ecr:PutImage",
                            "ecr:UploadLayerPart",
                            "events:PutRule",
                            "events:RemoveTargets",
                            "iam:CreateRole",
                            "iam:GetRole",
                            "iam:GetInstanceProfile",
                            "iam:PassRole",
                            "iam:ListInstanceProfiles",
                            "logs:*",
                            "s3:CreateBucket",
                            "s3:GetBucketLocation",
                            "s3:GetObject",
                            "s3:List*",
                            "s3:PutObject"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "logs:GetLogEvents"
                        ],
                        Resource: "arn:aws:logs:*:*:log-group:/aws/codebuild/*:log-stream:*",
                        Effect: "Allow"
                    }
                ]
            }
            return iamCalls.createPolicyIfNotExists(roleName, policyArn, policyDocument);
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

    let buildProjectName = codeBuildCalls.getBuildProjectName(handelAppName);

    return createBuildPhaseServiceRole(phaseContext.accountConfig.account_id)
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
                    ProjectName: codeBuildCalls.getBuildProjectName(phaseContext.handelAppName)
                },
                runOrder: 1
            }
        ]
    }
}

exports.getSecretsForPhase = function() {
    return Promise.resolve({});
}

/**
 * phaseContext: {
 *   pipelineName: <name>,
 *   accountConfig: <accountConfig>,
 *   phaseType: <type>,
 *   phaseName: <name>.
 *   params: <params>
 * }
 */
exports.createPhase = function(phaseContext, accountConfig) {
    return createBuildPhaseCodeBuildProject(phaseContext)
        .then(codeBuildProject => {
            return getCodePipelinePhaseSpec(phaseContext);
        });
}