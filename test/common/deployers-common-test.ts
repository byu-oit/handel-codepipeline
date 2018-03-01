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
import { expect } from 'chai';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as iamCalls from '../../src/aws/iam-calls';
import * as s3Calls from '../../src/aws/s3-calls';
import * as deployersCommon from '../../src/common/deployers-common';
import * as util from '../../src/common/util';

describe('deployersCommon module', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('uploadDirectoryToBucket', () => {
        it('should zip the directory and upload the file, then delete the temp file', async () => {
            const s3FileName = 'MyFile';
            const s3BucketName = 'MyBucket';
            const directory = '/fake/path/to/dir';

            const zipDirectoryStub = sandbox.stub(util, 'zipDirectoryToFile').resolves({});
            const uploadFileStub = sandbox.stub(s3Calls, 'uploadFile').resolves({
                Key: s3FileName,
                Bucket: s3BucketName
            });
            const unlinkStub = sandbox.stub(fs, 'unlinkSync').returns({});

            const s3ObjectInfo = await deployersCommon.uploadDirectoryToBucket(directory, s3FileName, s3BucketName);
            expect(s3ObjectInfo.Key).to.equal(s3FileName);
            expect(s3ObjectInfo.Bucket).to.equal(s3BucketName);
            expect(zipDirectoryStub.callCount).to.equal(1);
            expect(uploadFileStub.callCount).to.equal(1);
        });
    });

    describe('createLambdaCodePipelineRole', () => {
        it('should create the role for the Lambda', async () => {
            const accountId = 111111111111;
            const fakeArn = 'FakeArn';

            const createOrUpdateRoleStub = sandbox.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves({
                Arn: fakeArn
            });

            const role = await deployersCommon.createLambdaCodePipelineRole(accountId);
            expect(role!.Arn).to.equal(fakeArn);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
        });
    });
});
