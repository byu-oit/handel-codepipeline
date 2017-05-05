const handel = require('../../../lib/phases/handel');
const expect = require('chai').expect;
const sinon = require('sinon');
const iamCalls = require('../../../lib/aws/iam-calls');
const codebuildCalls = require('../../../lib/aws/codebuild-calls');

describe('codebuild phase module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getSecretsForPhase', function() {
        it('should return an empty object', function() {
            return handel.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                });
        });
    });

    describe('createPhase', function() {
        it('should create the codebuild project and return the phase config', function() {
            let phaseContext = {
                handelAppName: 'myApp',
                accountConfig: {
                    account_id: 111111111111
                },
                params: {
                    environments_to_deploy: ['dev']
                }
            }

            let role = {
                Arn: "FakeArn"
            }
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            let createProjectStub = sandbox.stub(codebuildCalls, 'createProject').returns(Promise.resolve)

            return handel.createPhase(phaseContext, {})
                .then(phase => {
                    expect(createRoleStub.calledOnce).to.be.true;
                    expect(createPolicyStub.calledOnce).to.be.true;
                    expect(attachPolicyStub.calledOnce).to.be.true;
                    expect(getRoleStub.calledOnce).to.be.true;
                    expect(createProjectStub.calledOnce).to.be.true;

                });
        });
    });
});