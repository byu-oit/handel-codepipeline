const expect = require('chai').expect;
const AWS = require('aws-sdk-mock');
const codepipelineCalls = require('../../lib/aws/codepipeline-calls');
const sinon = require('sinon');
const util = require('../../lib/util/util');
const s3Calls = require('../../lib/aws/s3-calls');
const iamCalls = require('../../lib/aws/iam-calls');

describe('codepipelineCalls module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('createPipeline', function() {
        it('should create the pipeline', function() {
            let pipelineName = "my-pipeline";
            let handelFile = {
                name: 'my-app'
            };
            let accountConfig = {
                account_id: 111111111111,
                region: 'us-west-2'
            };
            let pipelinePhases = [];
            let codePipelineBucketName = "FakeBucket";

            let role = {
                Arn: "FakeArn"
            }
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            AWS.mock('CodePipeline', 'createPipeline', Promise.resolve({
                pipeline: {}
            }));

            return codepipelineCalls.createPipeline(pipelineName, handelFile, accountConfig, pipelinePhases, codePipelineBucketName)
                .then(pipeline => {
                    expect(createRoleStub.calledOnce).to.be.true;
                    expect(createPolicyStub.calledOnce).to.be.true;
                    expect(attachPolicyStub.calledOnce).to.be.true;
                    expect(getRoleStub.calledOnce).to.be.true;
                    expect(pipeline).to.deep.equal({});
                });
        });
    });
});