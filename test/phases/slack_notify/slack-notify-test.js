const expect = require('chai').expect;
const slackNotify = require('../../../lib/phases/slack_notify');
const deployersCommon = require('../../../lib/phases/deployers-common');
const cloudFormationCalls = require('../../../lib/aws/cloudformation-calls');
const sinon = require('sinon');
const inquirer = require('inquirer');

describe('slack_notify module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the channel parameter', function () {
            let phaseConfig = {
                message: 'FakeMessage'
            };
            let errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'channel' parameter is required`);
        });

        it('should require the message parameter', function () {
            let phaseConfig = {
                channel: 'FakeChannel'
            };
            let errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'message' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                message: 'FakeMessage',
                channel: 'FakeChannel'
            };
            let errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should prompt for the Slack URL to use', function () {
            let url = "FakeUrl";
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({ slackUrl: url }));

            return slackNotify.getSecretsForPhase()
                .then(results => {
                    expect(results.slackUrl).to.equal(url);
                });
        });
    });

    describe('createPhase', function () {
        let phaseContext = {
            phaseName: 'MyPhase',
            params: {
                channel: '@myusername'
            },
            secrets: {
                slackUrl: 'MySlackUrl'
            }
        }
        let accountConfig = {
            account_id: '111111111111',
            region: 'us-west-2'
        }

        it('should create the role, upload the file, and create the stack when it doesnt exist', function () {
            let functionName = "MyFunction";
            let getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve(null));
            let createLambdaRoleStub = sandbox.stub(deployersCommon, 'createLambdaCodePipelineRole').returns(Promise.resolve({
                Arn: "fakeArn"
            }));
            let uploadDirectoryStub = sandbox.stub(deployersCommon, 'uploadDirectoryToBucket').returns(Promise.resolve({
                Bucket: "fakeBucket",
                Key: "fakeKey"
            }));
            let createStackStub = sandbox.stub(cloudFormationCalls, 'createStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            return slackNotify.createPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(getStackStub.calledOnce).to.be.true;
                    expect(createLambdaRoleStub.calledOnce).to.be.true;
                    expect(uploadDirectoryStub.calledOnce).to.be.true;
                    expect(createStackStub.calledOnce).to.be.true;
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                    expect(phaseSpec.actions[0].configuration.FunctionName).to.equal(functionName);
                });
        });

        it('should return the stack when it exists', function () {
            let functionName = "MyFunction";
            let getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            return slackNotify.createPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(getStackStub.calledOnce).to.be.true;
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                    expect(phaseSpec.actions[0].configuration.FunctionName).to.equal(functionName);
                });
        });
    });

    describe('deletePhase', function () {
        let phaseContext = {
            phaseName: 'FakePhase'
        }

        it('should delete the cloudformation stack if present', function () {
            let deleteStackStub = sandbox.stub(cloudFormationCalls, 'deleteStack').returns(Promise.resolve(true));
            let getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve({}));
            return slackNotify.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.equal(true);
                    expect(getStackStub.calledOnce).to.be.true;
                    expect(deleteStackStub.calledOnce).to.be.true;
                });
        });

        it('should return true if the stack is already deleted', function () {
            let deleteStackStub = sandbox.stub(cloudFormationCalls, 'deleteStack').returns(Promise.resolve(true));
            let getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve(null));
            return slackNotify.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.equal(true);
                    expect(getStackStub.calledOnce).to.be.true;
                    expect(deleteStackStub.notCalled).to.be.true;
                });
        });
    });
});