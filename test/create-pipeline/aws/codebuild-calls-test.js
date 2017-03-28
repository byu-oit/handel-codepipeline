const codeBuildCalls = require('../../../create-pipeline/aws/codebuild-calls');
const iamCalls = require('../../../create-pipeline/aws/iam-calls');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const expect = require('chai').expect;

describe('codebuild calls module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
        AWS.restore('CodeBuild');
    });

    describe('createProject', function() {
        it('should create the project', function() {
            let projectName = "FakeProject";

            AWS.mock('CodeBuild', 'createProject', Promise.resolve({
                project: {
                    Name: projectName
                }
            }));
            let fakePolicyArn = "FakePolicyArn";
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve({}));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve({
                Arn: fakePolicyArn
            }));
            let attachPolicyToRoleStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve({
                Arn: fakePolicyArn
            }));

            return codeBuildCalls.createProject(projectName, "FakeImage", { SOME_KEY: "some_value" }, "777777777777")
                .then(project => {
                    expect(project.Name).to.equal(projectName);
                    expect(createRoleStub.calledOnce).to.be.true;
                    expect(createPolicyStub.calledOnce).to.be.true;
                    expect(attachPolicyToRoleStub.calledOnce).to.be.true;
                    expect(getRoleStub.calledOnce).to.be.true;
                });
        });
    });
});