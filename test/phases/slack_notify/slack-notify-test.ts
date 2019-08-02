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
import { AccountConfig } from 'handel/src/datatypes';
import * as inquirer from 'inquirer';
import * as sinon from 'sinon';
import * as cloudFormationCalls from '../../../src/aws/cloudformation-calls';
import * as deployersCommon from '../../../src/common/deployers-common';
import * as util from '../../../src/common/util';
import { PhaseContext } from '../../../src/datatypes/index';
import * as slackNotify from '../../../src/phases/slack_notify';
import { SlackNotifyConfig } from '../../../src/phases/slack_notify';

describe('slack_notify module', () => {
    let accountConfig: AccountConfig;
    let phaseConfig: slackNotify.SlackNotifyConfig;
    let phaseContext: PhaseContext<slackNotify.SlackNotifyConfig>;

    beforeEach(() => {
        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'slack_notify',
            name: 'MyNotification',
            message: 'FakeMessage',
            channel: '@dsw88'
        };

        phaseContext = new PhaseContext<SlackNotifyConfig>(
            'myapp',
            'myphase',
            'slack_notify',
            'SomeBucket',
            'dev',
            accountConfig,
            phaseConfig,
            {}
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('check', () => {
        it('should require the channel parameter', () => {
            delete phaseConfig.channel;
            const errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'channel' parameter is required`);
        });

        it('should require the message parameter', () => {
            delete phaseConfig.message;
            const errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'message' parameter is required`);
        });

        it('should work when all required parameters are provided', () => {
            const errors = slackNotify.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for the Slack URL to use', async () => {
            const url = 'FakeUrl';
            const promptStub = sinon.stub(inquirer, 'prompt').returns(Promise.resolve({ slackUrl: url }));

            const results = await slackNotify.getSecretsForPhase(phaseConfig);
            expect(results.slackUrl).to.equal(url);
            expect(promptStub.callCount).to.equal(1);
        });
    });

    describe('deployPhase', () => {
        it('should create the role, upload the file, and create the stack when it doesnt exist', async () => {
            const functionName = 'MyFunction';
            const getStackStub = sinon.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve(null));
            const createLambdaRoleStub = sinon.stub(deployersCommon, 'createLambdaCodePipelineRole').returns(Promise.resolve({
                Arn: 'fakeArn'
            }));
            const uploadDirectoryStub = sinon.stub(deployersCommon, 'uploadDirectoryToBucket').returns(Promise.resolve({
                Bucket: 'fakeBucket',
                Key: 'fakeKey'
            }));
            const createStackStub = sinon.stub(cloudFormationCalls, 'createStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            const phaseSpec = await slackNotify.deployPhase(phaseContext, accountConfig);
            expect(getStackStub.callCount).to.equal(1);
            expect(createLambdaRoleStub.callCount).to.equal(1);
            expect(uploadDirectoryStub.callCount).to.equal(1);
            expect(createStackStub.callCount).to.equal(1);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
            expect(phaseSpec.actions[0]!.configuration!.FunctionName).to.equal(functionName);
        });

        it('should return the stack when it exists', async () => {
            const functionName = 'MyFunction';
            const getStackStub = sinon.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            const phaseSpec = await slackNotify.deployPhase(phaseContext, accountConfig);
            expect(getStackStub.callCount).to.equal(1);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
            expect(phaseSpec.actions[0]!.configuration!.FunctionName).to.equal(functionName);
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', async () => {
            const result = await slackNotify.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
        });
    });
});
