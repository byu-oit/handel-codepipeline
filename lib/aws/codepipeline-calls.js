const AWS = require('aws-sdk');
const s3Calls = require('../aws/s3-calls');
const iamCalls = require('../aws/iam-calls');
const winston = require('winston');

function createCodePipelineRole(accountId) {
    let roleName = 'HandelCodePipelineServiceRole';
    return iamCalls.createRoleIfNotExists(roleName, 'codepipeline.amazonaws.com')
        .then(role => {
            let policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${roleName}`;
            let policyDocument = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "s3:GetObject",
                            "s3:GetObjectVersion",
                            "s3:GetBucketVersioning"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "s3:PutObject"
                        ],
                        Resource: [
                            "arn:aws:s3:::codepipeline*",
                            "arn:aws:s3:::elasticbeanstalk*"
                        ],
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "codecommit:CancelUploadArchive",
                            "codecommit:GetBranch",
                            "codecommit:GetCommit",
                            "codecommit:GetUploadArchiveStatus",
                            "codecommit:UploadArchive"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "cloudwatch:*",
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "lambda:InvokeFunction",
                            "lambda:ListFunctions"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "codebuild:BatchGetBuilds",
                            "codebuild:StartBuild"
                        ],
                        Resource: "*",
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

function createPipeline(codePipeline, createParams) {
    const deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    function createPipeline() {
        codePipeline.createPipeline(createParams).promise()
            .then(createResult => {
                deferred.resolve(createResult);
            })
            .catch(err => {
                if(err.code === 'InvalidStructureException') { //Try again because the IAM role isn't available yet
                    setTimeout(function() {
                        createPipeline();
                    }, 5000);  
                }
                else {
                    deferred.reject(err);
                }
            });
    }
    createPipeline();

    return deferred.promise;
}


function createCodePipelineProject(codePipeline, accountId, projectName, codePipelineBucketName, codePipelinePhases) {
    return createCodePipelineRole(accountId)
        .then(codePipelineRole => {
            let createParams = {
                pipeline: {
                    version: 1,
                    name: projectName,
                    artifactStore: {
                        type: "S3",
                        location: codePipelineBucketName
                    },
                    roleArn: codePipelineRole.Arn,
                    stages: []
                }
            };

            for(let phase of codePipelinePhases) {
                createParams.pipeline.stages.push(phase);
            }

            return createPipeline(codePipeline, createParams)
                .then(createResult => {
                    return createResult.pipeline;
                });
        });
}

exports.createPipeline = function(pipelineName, handelFile, accountConfig, pipelinePhases) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });

    let accountId = accountConfig.account_id;
    winston.info(`Creating CodePipeline for the pipeline '${pipelineName}'`);

    let codePipelineBucketName = `codepipeline-${accountConfig.region}-${accountId}`
    let projectName = handelFile.name;
    return s3Calls.createBucketIfNotExists(codePipelineBucketName, accountConfig.region)
        .then(bucket => {
            return createCodePipelineProject(codePipeline, accountId, projectName, codePipelineBucketName, pipelinePhases);
        });
}