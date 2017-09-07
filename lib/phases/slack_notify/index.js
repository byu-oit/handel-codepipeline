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
const inquirer = require('inquirer');
const winston = require('winston');
const util = require('../../common/util');
const cloudformationCalls = require('../../aws/cloudformation-calls');
const deployersCommon = require('../../common/deployers-common');

const STACK_NAME = "HandelCodePipelineSlackNotifyLambda";

function getSlackNotifyPhaseSpec(phaseContext, notifyFunctionName) {
    winston.info(`Creating slack notification phase '${phaseContext.phaseName}'`);

    let userParameters = {
        webhook: phaseContext.secrets.slackUrl,
        message: phaseContext.params.message,
        username: 'Handel-CodePipeline Notify',
        channel: phaseContext.params.channel
    };
    
    return {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Invoke",
                    owner: "AWS",
                    version: "1",
                    provider: "Lambda"
                },
                configuration: {
                    FunctionName: notifyFunctionName,
                    UserParameters: JSON.stringify(userParameters)
                },
                runOrder: 1
            }
        ]
    }
}

exports.check = function(phaseConfig) {
    let errors = [];

    if(!phaseConfig.channel) {
        errors.push(`Slack Notify - The 'channel' parameter is required`);
    }
    if(!phaseConfig.message) {
        errors.push(`Slack Notify - The 'message' parameter is required`);
    }
    
    return errors;
}

exports.getSecretsForPhase = function () {
    return inquirer.prompt(exports.secretsRequired);
}

exports.secretsRequired = [
    {
        type: 'input',
        name: 'slackUrl',
        message: 'Please enter the URL for Slack Notifications',
    }
]

exports.deployPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating slack_notify phase '${phaseContext.phaseName}'`);
    
    return cloudformationCalls.getStack(STACK_NAME)
        .then(stack => {
            if (!stack) {
                winston.info(`Creating Lambda function for Slack notifications`);
                return deployersCommon.createLambdaCodePipelineRole(accountConfig.account_id)
                    .then(role => {
                        let directoryToUpload = `${__dirname}/slack-notify-code`;
                        let s3FileName = 'handel-codepipeline/slackNotifyLambda';
                        let s3BucketName = `codepipeline-${accountConfig.region}-${accountConfig.account_id}`;
                        return deployersCommon.uploadDirectoryToBucket(directoryToUpload, s3FileName, s3BucketName)
                            .then(s3ObjectInfo => {
                                let template = util.loadFile(`${__dirname}/lambda.yml`);
                                let parameters = {
                                    S3Bucket: s3ObjectInfo.Bucket,
                                    S3Key: s3ObjectInfo.Key,
                                    Description: 'Lambda Function for the Slack notify phase in Handel-CodePipeline',
                                    FunctionName: STACK_NAME,
                                    Handler: 'notify.send_post',
                                    MemorySize: '128',
                                    RoleArn: role.Arn,
                                    Runtime: 'python3.6',
                                    Timeout: '5'
                                }
                                return cloudformationCalls.createStack(STACK_NAME, template, cloudformationCalls.getCfStyleStackParameters(parameters));
                            });
                    });
            }
            else {
                return stack;
            }
        })
        .then(deployedStack => {
            let functionName = cloudformationCalls.getOutput('FunctionName', deployedStack);
            return getSlackNotifyPhaseSpec(phaseContext, functionName);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    winston.info(`Nothing to delete for slack_notify phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}