const AWS = require('aws-sdk');
const iamCalls = require('../aws/iam-calls');

function getCodeBuildEnvVarDef(key, value) {
    return {
        name: key,
        value: value
    }
}

function createCodeBuildServiceRole(accountId) {
    let roleName = 'HandelCodeBuildServiceRole'
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

exports.createProject = function (projectName, imageName, environmentVariables, accountId, serviceRoleArn) {
    return createCodeBuildServiceRole(accountId)
        .then(role => {
            const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
            var createParams = {
                name: projectName,
                description: projectName,
                source: {
                    type: 'CODEPIPELINE'
                },
                artifacts: {
                    type: 'CODEPIPELINE'
                },
                environment: {
                    computeType: 'BUILD_GENERAL1_SMALL',
                    image: imageName,
                    type: 'LINUX_CONTAINER',
                    environmentVariables: []
                },
                serviceRole: role.Arn,
                tags: [
                    {
                        key: 'Name',
                        value: projectName
                    }
                ]
            };

            //Inject pre-provided environment variables
            createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_ACCOUNT_ID", accountId));
            createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_REGION", 'us-west-2')); //TODO - Hardcoded for now
            createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("HANDEL_PIPELINE_NAME", projectName));

            //Add environment variables for codebuild project
            for(let envKey in environmentVariables) {
                createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef(envKey, environmentVariables[envKey]));
            }
            
            console.log(createParams.environment.environmentVariables);

            return codeBuild.createProject(createParams).promise()
                .then(createResponse => {
                    return createResponse.project;
                });
        });
}