const handel = require('../../../lib/phases/handel');
const expect = require('chai').expect;
const sinon = require('sinon');
const iamCalls = require('../../../lib/aws/iam-calls');
const codebuildCalls = require('../../../lib/aws/codebuild-calls');

describe('codebuild phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the environments_to_deploy parameter', function () {
            let phaseConfig = {};
            let errors = handel.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'environments_to_deploy' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                environments_to_deploy: ['dev']
            };
            let errors = handel.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should return an empty object', function () {
            return handel.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                });
        });
    });

    describe('createPhase', function () {
        it('should create the codebuild project and return the phase config', function () {
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

    describe('deletePhase', function () {
        let phaseContext = {
            phaseName: 'FakePhase',
            handelAppName: 'FakeApp',
            params: {
                environments_to_deploy: ['dev']
            }
        }
        it('should delete the codebuild project', function () {
            let deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').returns(Promise.resolve(true))
            return handel.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.be.true;
                    expect(deleteProjectStub.calledOnce).to.be.true;
                });
        });
    });
});