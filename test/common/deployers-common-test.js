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
const expect = require('chai').expect;
const deployersCommon = require('../../dist/common/deployers-common');
const sinon = require('sinon');
const util = require('../../dist/common/util');
const s3Calls = require('../../dist/aws/s3-calls');
const iamCalls = require('../../dist/aws/iam-calls');
const fs = require('fs');

describe('deployersCommon module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('uploadDirectoryToBucket', function() {
        it('should zip the directory and upload the file, then delete the temp file', function() {
            let s3FileName = "MyFile";
            let s3BucketName = "MyBucket";
            let directory = "/fake/path/to/dir";

            let zipDirectoryStub = sandbox.stub(util, 'zipDirectoryToFile').returns(Promise.resolve({}));
            let uploadFileStub = sandbox.stub(s3Calls, 'uploadFile').returns(Promise.resolve({
                Key: s3FileName,
                Bucket: s3BucketName
            }));
            let unlinkStub = sandbox.stub(fs, 'unlinkSync').returns({});

            return deployersCommon.uploadDirectoryToBucket(directory, s3FileName, s3BucketName)
                .then(s3ObjectInfo => {
                    expect(s3ObjectInfo.Key).to.equal(s3FileName);
                    expect(s3ObjectInfo.Bucket).to.equal(s3BucketName);
                    expect(zipDirectoryStub.calledOnce).to.be.true;
                    expect(uploadFileStub.calledOnce).to.be.true;
                });
        });
    });

    describe('createLambdaCodePipelineRole', function() {
        it('should create the role for the Lambda', function() {
            let accountId = "111111111111";
            let fakeArn = "FakeArn";

            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve({}));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve({
                Arn: fakeArn
            }));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve({
                Arn: fakeArn
            }));

            return deployersCommon.createLambdaCodePipelineRole(accountId)
                .then(role => {
                    expect(role.Arn).to.equal(fakeArn);
                    expect(createRoleStub.calledOnce).to.be.true;    
                    expect(createPolicyStub.calledOnce).to.be.true;    
                    expect(attachPolicyStub.calledOnce).to.be.true;    
                    expect(getRoleStub.calledOnce).to.be.true;    
                });
        });
    });
});