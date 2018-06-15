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
import * as AWS from 'aws-sdk';
import { AccountConfig } from 'handel/src/datatypes';
import * as winston from 'winston';
import * as iamCalls from '../aws/iam-calls';
import awsWrapper from './aws-wrapper';

const CODEPIPELINE_ROLE_NAME = 'HandelCodePipelineServiceRole';

async function createCodePipelineRole(accountId: string) {
    const trustedServices = ['codepipeline.amazonaws.com', 'cloudformation.amazonaws.com'];
    const policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${CODEPIPELINE_ROLE_NAME}`;
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: [
                    's3:GetObject',
                    's3:GetObjectVersion',
                    's3:GetBucketVersioning'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    's3:PutObject'
                ],
                Resource: [
                    'arn:aws:s3:::codepipeline*',
                    'arn:aws:s3:::elasticbeanstalk*'
                ],
                Effect: 'Allow'
            },
            {
                Action: [
                    'codecommit:CancelUploadArchive',
                    'codecommit:GetBranch',
                    'codecommit:GetCommit',
                    'codecommit:GetUploadArchiveStatus',
                    'codecommit:UploadArchive'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'cloudwatch:*',
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'lambda:InvokeFunction',
                    'lambda:ListFunctions'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'codebuild:BatchGetBuilds',
                    'codebuild:StartBuild'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'cloudformation:*'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'iam:PassRole'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'cloudwatch:*'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'iam:DeleteRole'
                ],
                Resource: '*',
                Effect: 'Allow'
            },
            {
                Action: [
                    'iam:DeleteRolePolicy'
                ],
                Resource: '*',
                Effect: 'Allow'
            }
        ]
    };
    return iamCalls.createOrUpdateRoleAndPolicy(CODEPIPELINE_ROLE_NAME, trustedServices, policyArn, policyDocument);
}

function createPipelineWithRetries(createParams: AWS.CodePipeline.CreatePipelineInput) {
    const deferred: any = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    function createPipelineRec() {
        awsWrapper.codePipeline.createPipeline(createParams)
            .then(createResult => {
                deferred.resolve(createResult);
            })
            .catch(err => {
                if (err.code === 'InvalidStructureException') { // Try again because the IAM role isn't available yet
                    setTimeout(() => {
                        createPipelineRec();
                    }, 5000);
                }
                else {
                    deferred.reject(err);
                }
            });
    }
    createPipelineRec();

    return deferred.promise;
}

function getPipelineConfig(pipelineProjectName: string, codePipelineBucketName: string, codePipelinePhases: AWS.CodePipeline.StageDeclaration[], codePipelineRole: AWS.IAM.Role) {
    const pipeline: AWS.CodePipeline.PipelineDeclaration = {
        version: 1,
        name: pipelineProjectName,
        artifactStore: {
            type: 'S3',
            location: codePipelineBucketName
        },
        roleArn: codePipelineRole.Arn,
        stages: []
    };
    const pipelineConfig = {
        pipeline: pipeline
    };

    for (const phase of codePipelinePhases) {
        pipelineConfig.pipeline.stages.push(phase);
    }
    return pipelineConfig;
}

async function createCodePipelineProject(accountId: string, pipelineProjectName: string, codePipelineBucketName: string, codePipelinePhases: AWS.CodePipeline.StageDeclaration[]): Promise<AWS.CodePipeline.PipelineDeclaration> {
    const codePipelineRole = await createCodePipelineRole(accountId);
    if (!codePipelineRole) {
        throw new Error(`Couldn't create CodePipeline role`);
    }
    const pipelineConfig = getPipelineConfig(pipelineProjectName, codePipelineBucketName, codePipelinePhases, codePipelineRole);
    const createResult = await createPipelineWithRetries(pipelineConfig);
    return createResult.pipeline;
}

export function getPipelineProjectName(appName: string, pipelineName: string): string {
    return `${appName}-${pipelineName}`;
}

export function getPipelineWebhookName(appName: string, pipelineName: string): string {
    return `${appName}-${pipelineName}-webhook`;
}

export function createPipeline(appName: string, pipelineName: string, accountConfig: AccountConfig, pipelinePhases: AWS.CodePipeline.StageDeclaration[], codePipelineBucketName: string): Promise<AWS.CodePipeline.PipelineDeclaration> {
    const accountId = accountConfig.account_id;
    const pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);

    winston.info(`Creating CodePipeline for the pipeline '${pipelineProjectName}'`);
    return createCodePipelineProject(accountId, pipelineProjectName, codePipelineBucketName, pipelinePhases);
}

export async function getPipeline(pipelineName: string): Promise<AWS.CodePipeline.PipelineDeclaration | null> {
    const getParams = {
        name: pipelineName
    };

    try {
        const result = await awsWrapper.codePipeline.getPipeline(getParams);
        if (result.pipeline) {
            return result.pipeline;
        }
        else {
            return null;
        }
    }
    catch (err) {
        if (err.code === 'PipelineNotFoundException') {
            return null; // No pipeline found
        }
        throw err;
    }
}

export async function updatePipeline(appName: string, pipelineName: string, accountConfig: AccountConfig, pipelinePhases: AWS.CodePipeline.StageDeclaration[], codePipelineBucketName: string): Promise<AWS.CodePipeline.PipelineDeclaration> {
    const pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);
    const codePipelineRole = await iamCalls.getRole(CODEPIPELINE_ROLE_NAME);
    const pipelineConfig = getPipelineConfig(pipelineProjectName, codePipelineBucketName, pipelinePhases, codePipelineRole!);
    const updateResult = await awsWrapper.codePipeline.updatePipeline(pipelineConfig);
    return updateResult.pipeline!; // TODO - Stop using !
}

export async function deletePipeline(appName: string, pipelineName: string): Promise<boolean> {
    const pipelineProjectName = exports.getPipelineProjectName(appName, pipelineName);
    winston.info(`Deleting CodePipeline ${pipelineProjectName}`);

    const deleteParams = {
        name: pipelineProjectName
    };

    const deleteResult = await awsWrapper.codePipeline.deletePipeline(deleteParams);
    return true;
}

export async function putWebhook(webhook: AWS.CodePipeline.PutWebhookInput): Promise<AWS.CodePipeline.PutWebhookOutput> {
    return await awsWrapper.codePipeline.putWebhook(webhook);
}

export async function deleteWebhook(webhookName: string): Promise<AWS.CodePipeline.DeleteWebhookOutput> {
    const webhook: AWS.CodePipeline.DeleteWebhookInput = {
        'name': webhookName
    };
    return await awsWrapper.codePipeline.deleteWebhook(webhook);
}

export async function registerWebhook(webhookName: string): Promise<AWS.CodePipeline.RegisterWebhookWithThirdPartyOutput> {
    const webhook: AWS.CodePipeline.RegisterWebhookWithThirdPartyInput = {
        'webhookName': webhookName
    };
    return await awsWrapper.codePipeline.registerWebhook(webhook);
}

export async function deregisterWebhook(webhookName: string): Promise<AWS.CodePipeline.DeregisterWebhookWithThirdPartyOutput> {
    const webhook: AWS.CodePipeline.DeregisterWebhookWithThirdPartyInput = {
        'webhookName': webhookName
    };
    return await awsWrapper.codePipeline.deregisterWebhook(webhook);
}

export async function listWebhooks(): Promise<AWS.CodePipeline.ListWebhooksOutput> {
    return await awsWrapper.codePipeline.listWebhooks();
}
