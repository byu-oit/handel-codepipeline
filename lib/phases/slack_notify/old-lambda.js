const cloudformationCalls = require('../aws/cloudformation-calls');
const s3Calls = require('../aws/s3-calls');
const iamCalls = require('../aws/iam-calls');
const util = require('../util/util');
const fs = require('fs');

function createCodePipelineRole(accountId) {
    let roleName = 'HandelCodePipelineLambdaRole';
    return iamCalls.createRoleIfNotExists(roleName, 'codepipeline.amazonaws.com')
        .then(role => {
            let policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${roleName}`;
            let policyDocument = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: [
                            "logs:*"
                        ],
                        Effect: "Allow",
                        Resource: "arn:aws:logs:*:*:*"
                    },
                    {
                        Action: [
                            "codepipeline:PutJobSuccessResult",
                            "codepipeline:PutJobFailureResult"
                        ],
                        Effect: "Allow",
                        Resource: "*"
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

function uploadLambdaCodeToBucket(directoryToUpload, s3FileName, s3BucketName) {
    let zippedPath = `/tmp/${s3FileName}.zip`;
    return util.zipDirectoryToFile(directoryToUpload, zippedPath)
        .then(() => {
            return s3Calls.uploadFile(s3BucketName, s3FileName, zippedPath)
                .then(s3ObjectInfo => {
                    fs.unlinkSync(zippedPath);
                    return s3ObjectInfo;
                });
        });
}

exports.createSlackNotifyLambdaIfNotExists = function (accountId, region) {
    let stackName = 'HandelCodePipelineSlackNotifyLambda';

    return createCodePipelineRole(accountId)
        .then(role => {
            let directoryToUpload = `${__dirname}/slack-notify-code`;
            let s3FileName = 'slackNotifyLambda.zip'
            let s3BucketName = `codepipeline-${region}-${accountId}`
            return uploadLambdaCodeToBucket(directoryToUpload, s3FileName, s3BucketName)
                .then(s3ObjectInfo => {
                    return cloudformationCalls.getStack(stackName)
                        .then(stack => {
                            if (!stack) { //Need to create Lambda
                                let lambdaTemplate = util.loadYamlFile(`${__dirname}/lambda.yml`);
                                let parameters = {
                                    S3Bucket: s3ObjectInfo.Bucket,
                                    S3Key: s3ObjectInfo.Key,
                                    Description: 'Lambda Function for the Slack notify phase in Handel-CodePipeline',
                                    FunctionName: stackName,
                                    Handler: 'notify.send_post',
                                    MemorySize: '128',
                                    RoleArn: role.Arn,
                                    Runtime: 'python3.6',
                                    Timeout: '5'
                                }

                                return cloudformationCalls.createStack(stackName, lambdaTemplate, cloudformationCalls.getCfStyleStackParameters(parameters))
                                    .then(stack => {
                                        return cloudformationCalls.getOutput('FunctionName', stack);
                                    });
                            }
                            else { //Already exists
                                return cloudformationCalls.getOutput('FunctionName', stack);
                            }
                        });
                });
        });
}