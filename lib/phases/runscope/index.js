const inquirer = require('inquirer');
const cloudformationCalls = require('../../aws/cloudformation-calls');
const deployersCommon = require('../deployers-common');
const util = require('../../util/util');
const winston = require('winston');

const STACK_NAME = "HandelCodePipelineRunscopeLambda";

function getRunscopePhaseSpec(phaseContext, runscopeFunctionName) {
    winston.info(`Creating runscope phase '${phaseContext.phaseName}'`);

    let userParameters = {
        runscopeTriggerUrl: phaseContext.secrets.runscopeTriggerUrl,
        runscopeAccessToken: phaseContext.secrets.runscopeAccessToken
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
                    FunctionName: runscopeFunctionName,
                    UserParameters: JSON.stringify(userParameters)
                },
                runOrder: 1
            }
        ]
    }
}

exports.check = function (phaseConfig) {
    let errors = [];

    //No required parameters

    return errors;
}

exports.getSecretsForPhase = function () {
    let questions = [
        {
            type: 'input',
            name: 'runscopeTriggerUrl',
            message: 'Please enter your Runscope Trigger URL',
        },
        {
            type: 'input',
            name: 'runscopeAccessToken',
            message: 'Please enter your Runscope Access Token'
        }
    ];
    return inquirer.prompt(questions);
}

exports.createPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating runscope phase '${phaseContext.phaseName}'`);
    return cloudformationCalls.getStack(STACK_NAME)
        .then(stack => {
            if (!stack) {
                winston.info(`Creating Lambda function for Runscope tests`);
                return deployersCommon.createLambdaCodePipelineRole(accountConfig.account_id)
                    .then(role => {
                        let directoryToUpload = `${__dirname}/runscope-code`;
                        let s3FileName = 'handel-codepipeline/runscope';
                        let s3BucketName = `codepipeline-${accountConfig.region}-${accountConfig.account_id}`;
                        return deployersCommon.uploadDirectoryToBucket(directoryToUpload, s3FileName, s3BucketName)
                            .then(s3ObjectInfo => {
                                let template = util.loadFile(`${__dirname}/runscope-lambda.yml`);
                                let parameters = {
                                    S3Bucket: s3ObjectInfo.Bucket,
                                    S3Key: s3ObjectInfo.Key,
                                    Description: 'Lambda Function for the Runscope phase in Handel-CodePipeline',
                                    FunctionName: STACK_NAME,
                                    Handler: 'runscope.run_tests',
                                    MemorySize: '128',
                                    RoleArn: role.Arn,
                                    Runtime: 'python3.6',
                                    Timeout: '300'
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
            return getRunscopePhaseSpec(phaseContext, functionName);
        });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    winston.info(`Nothing to delete for runscope phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}

