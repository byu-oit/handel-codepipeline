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
const AWS = require('aws-sdk');
const iamCalls = require('../aws/iam-calls');
const winston = require('winston');

let CODEPIPELINE_ROLE_NAME = 'HandelCodePipelineServiceRole';

function createCodePipelineRole(accountId) {
    return iamCalls.createRoleIfNotExists(CODEPIPELINE_ROLE_NAME, ['codepipeline.amazonaws.com', 'cloudformation.amazonaws.com'])
        .then(role => {
            let policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${CODEPIPELINE_ROLE_NAME}`;
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
                    },
                    {
                        Action: [
                            "cloudformation:*"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "iam:PassRole"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "cloudwatch:*"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "iam:DeleteRole"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    },
                    {
                        Action: [
                            "iam:DeleteRolePolicy"
                        ],
                        Resource: "*",
                        Effect: "Allow"
                    }
                ]
            }
            return iamCalls.createPolicyIfNotExists(CODEPIPELINE_ROLE_NAME, policyArn, policyDocument);
        })
        .then(policy => {
            return iamCalls.attachPolicyToRole(policy.Arn, CODEPIPELINE_ROLE_NAME);
        })
        .then(policyAttachment => {
            return iamCalls.getRole(CODEPIPELINE_ROLE_NAME);
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
                if (err.code === 'InvalidStructureException') { //Try again because the IAM role isn't available yet
                    setTimeout(function () {
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

function getPipelineConfig(pipelineProjectName, codePipelineBucketName, codePipelinePhases, codePipelineRole) {
    let pipelineConfig = {
        pipeline: {
            version: 1,
            name: pipelineProjectName,
            artifactStore: {
                type: "S3",
                location: codePipelineBucketName
            },
            roleArn: codePipelineRole.Arn,
            stages: []
        }
    };

    for (let phase of codePipelinePhases) {
        pipelineConfig.pipeline.stages.push(phase);
    }
    return pipelineConfig;
}

function createCodePipelineProject(codePipeline, accountId, pipelineProjectName, codePipelineBucketName, codePipelinePhases) {
    return createCodePipelineRole(accountId)
        .then(codePipelineRole => {
            let pipelineConfig = getPipelineConfig(pipelineProjectName, codePipelineBucketName, codePipelinePhases, codePipelineRole);

            return createPipeline(codePipeline, pipelineConfig)
                .then(createResult => {
                    return createResult.pipeline;
                });
        });
}

exports.getPipelineProjectName = function (appName, pipelineName) {
    return `${appName}-${pipelineName}`;
}

exports.createPipeline = function (appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
    let accountId = accountConfig.account_id;
    let pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);

    winston.info(`Creating CodePipeline for the pipeline '${pipelineProjectName}'`);
    return createCodePipelineProject(codePipeline, accountId, pipelineProjectName, codePipelineBucketName, pipelinePhases);
}

exports.getPipeline = function (pipelineName) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });

    let getParams = {
        name: pipelineName
    }

    return codePipeline.getPipeline(getParams).promise()
        .then(result => {
            return result.pipeline;
        })
        .catch(err => {
            if (err.code === 'PipelineNotFoundException') {
                return null; //No pipeline found   
            }
            throw err;
        });
}

exports.updatePipeline = function (appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
    let pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);

    return iamCalls.getRole(CODEPIPELINE_ROLE_NAME)
        .then(codePipelineRole => {
            let pipelineConfig = getPipelineConfig(pipelineProjectName, codePipelineBucketName, pipelinePhases, codePipelineRole);
            return codePipeline.updatePipeline(pipelineConfig).promise()
                .then(updateResult => {
                    return updateResult.pipeline;
                });
        });
}

exports.deletePipeline = function (appName, pipelineName) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
    let pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);
    winston.info(`Deleting CodePipeline ${pipelineProjectName}`);

    var deleteParams = {
        name: pipelineProjectName
    };

    return codePipeline.deletePipeline(deleteParams).promise()
        .then(deleteResult => {
            return deleteResult;
        })
}