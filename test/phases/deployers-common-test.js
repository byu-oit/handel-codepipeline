const expect = require('chai').expect;
const deployersCommon = require('../../lib/phases/deployers-common');
const sinon = require('sinon');
const util = require('../../lib/util/util');
const s3Calls = require('../../lib/aws/s3-calls');
const iamCalls = require('../../lib/aws/iam-calls');
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