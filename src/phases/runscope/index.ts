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
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as inquirer from 'inquirer';
import * as winston from 'winston';
import * as cloudformationCalls from '../../aws/cloudformation-calls';
import * as deployersCommon from '../../common/deployers-common';
import * as util from '../../common/util';
import { PhaseConfig, PhaseContext, PhaseSecrets } from '../../datatypes/index';

const STACK_NAME = 'HandelCodePipelineRunscopeLambda';

function getRunscopePhaseSpec(phaseContext: PhaseContext<PhaseConfig>, runscopeFunctionName: string): AWS.CodePipeline.StageDeclaration {
    winston.info(`Creating runscope phase '${phaseContext.phaseName}'`);

    const userParameters = {
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
                    category: 'Invoke',
                    owner: 'AWS',
                    version: '1',
                    provider: 'Lambda'
                },
                configuration: {
                    FunctionName: runscopeFunctionName,
                    UserParameters: JSON.stringify(userParameters)
                },
                runOrder: 1
            }
        ]
    };
}

export function check(phaseConfig: PhaseConfig): string[] {
    return []; // No required parameters
}

export function getSecretsForPhase(phaseConfig: PhaseConfig): Promise<PhaseSecrets> {
    const questions = [
        {
            type: 'input',
            name: 'runscopeTriggerUrl',
            message: `'${phaseConfig.name}' phase - Please enter your Runscope Trigger URL`,
        },
        {
            type: 'input',
            name: 'runscopeAccessToken',
            message: `'${phaseConfig.name}' phase - Please enter your Runscope Access Token`
        }
    ];
    return inquirer.prompt(questions);
}

export async function deployPhase(phaseContext: PhaseContext<PhaseConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    winston.info(`Creating runscope phase '${phaseContext.phaseName}'`);
    let stack = await cloudformationCalls.getStack(STACK_NAME);
    if (!stack) {
        winston.info(`Creating Lambda function for Runscope tests`);
        const role = await deployersCommon.createLambdaCodePipelineRole(accountConfig.account_id);
        if(!role) {
            throw new Error(`Runscope Lambda role could not be created`);
        }
        const directoryToUpload = `${__dirname}/runscope-code`;
        const s3FileName = 'handel-codepipeline/runscope';
        const s3BucketName = `codepipeline-${accountConfig.region}-${accountConfig.account_id}`;
        const s3ObjectInfo = await deployersCommon.uploadDirectoryToBucket(directoryToUpload, s3FileName, s3BucketName);
        const template = util.loadFile(`${__dirname}/runscope-lambda.yml`);
        if(!template) {
            throw new Error(`Could not load template for Runscope Lambda`);
        }
        const parameters = {
            S3Bucket: s3ObjectInfo.Bucket,
            S3Key: s3ObjectInfo.Key,
            Description: 'Lambda Function for the Runscope phase in Handel-CodePipeline',
            FunctionName: STACK_NAME,
            Handler: 'runscope.run_tests',
            MemorySize: '128',
            RoleArn: role.Arn,
            Runtime: 'python3.6',
            Timeout: '300'
        };
        stack = await cloudformationCalls.createStack(STACK_NAME, template, cloudformationCalls.getCfStyleStackParameters(parameters));
    }
    const functionName = cloudformationCalls.getOutput('FunctionName', stack);
    return getRunscopePhaseSpec(phaseContext, functionName);
}

export function deletePhase(phaseContext: PhaseContext<PhaseConfig>, accountConfig: AccountConfig): Promise<boolean> {
    winston.info(`Nothing to delete for runscope phase '${phaseContext.phaseName}'`);
    return Promise.resolve(true); // Nothing to delete
}
