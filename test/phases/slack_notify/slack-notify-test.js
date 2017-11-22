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
const slackNotify = require('../../../dist/phases/slack_notify');
const deployersCommon = require('../../../dist/common/deployers-common');
const cloudFormationCalls = require('../../../dist/aws/cloudformation-calls');
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

            return slackNotify.getSecretsForPhase({ name: 'FakePhaseName'})
                .then(results => {
                    expect(results.slackUrl).to.equal(url);
                    expect(promptStub.callCount).to.equal(1);
                });
        });
    });

    describe('deployPhase', function () {
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

            return slackNotify.deployPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(getStackStub.callCount).to.equal(1);
                    expect(createLambdaRoleStub.callCount).to.equal(1);
                    expect(uploadDirectoryStub.callCount).to.equal(1);
                    expect(createStackStub.callCount).to.equal(1);
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

            return slackNotify.deployPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(getStackStub.callCount).to.equal(1);
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                    expect(phaseSpec.actions[0].configuration.FunctionName).to.equal(functionName);
                });
        });
    });

    describe('deletePhase', function () {
        it('should do nothing', function () {
            return slackNotify.deletePhase({}, {})
                .then(result => {
                    expect(result).to.deep.equal({});
                });
        });
    });
});