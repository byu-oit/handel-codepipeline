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
import * as fs from 'fs';
import * as os from 'os';
import * as uuid from 'uuid';
import * as iamCalls from '../aws/iam-calls';
import * as s3Calls from '../aws/s3-calls';
import * as util from './util';

export async function uploadDirectoryToBucket(directoryToUpload: string, s3FileName: string, s3BucketName: string): Promise<AWS.S3.ManagedUpload.SendData> {
    const zippedPath = `${os.tmpdir()}/${uuid()}.zip`;
    await util.zipDirectoryToFile(directoryToUpload, zippedPath);
    const s3ObjectInfo = await s3Calls.uploadFile(s3BucketName, s3FileName, zippedPath);
    fs.unlinkSync(zippedPath);
    return s3ObjectInfo;
}

export async function createLambdaCodePipelineRole(accountId: number): Promise<AWS.IAM.Role | null> {
    const roleName = 'HandelCodePipelineLambdaRole';
    const policyArn = `arn:aws:iam::${accountId}:policy/handel-codepipeline/${roleName}`;
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: [
                    'logs:*'
                ],
                Effect: 'Allow',
                Resource: 'arn:aws:logs:*:*:*'
            },
            {
                Action: [
                    'codepipeline:PutJobSuccessResult',
                    'codepipeline:PutJobFailureResult'
                ],
                Effect: 'Allow',
                Resource: '*'
            }
        ]
    };
    return iamCalls.createOrUpdateRoleAndPolicy(roleName, ['lambda.amazonaws.com'], policyArn, policyDocument);
}
