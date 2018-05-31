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
import * as AWS from 'aws-sdk';
import { expect } from 'chai';
import { AccountConfig } from 'handel/src/datatypes';
import * as sinon from 'sinon';
import awsWrapper from '../../src/aws/aws-wrapper';
import * as codepipelineCalls from '../../src/aws/codepipeline-calls';
import * as iamCalls from '../../src/aws/iam-calls';
import * as util from '../../src/common/util';

describe('codepipelineCalls module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../example-account-config.yml`);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('createPipeline', () => {
        it('should create the pipeline', async () => {
            const pipelineName = 'my-pipeline';
            const appName = 'my-app';
            const pipelinePhases: AWS.CodePipeline.StageDeclaration[] = [];
            const codePipelineBucketName = 'FakeBucket';

            const role = {
                Arn: 'FakeArn'
            };
            const createOrUpdateRoleStub = sandbox.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const createPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'createPipeline').resolves({
                pipeline: {}
            });

            const pipeline = await codepipelineCalls.createPipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('getPipeline', () => {
        it('should return null when the pipeline does not exist', async () => {
            const getPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'getPipeline').rejects({
                code: 'PipelineNotFoundException'
            });
            const pipeline = await codepipelineCalls.getPipeline('FakeName');
            expect(getPipelineStub.callCount).to.equal(1);
            expect(pipeline).to.equal(null);
        });

        it('should return the pipeline when it exists', async () => {
            const getPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'getPipeline').resolves({
                pipeline: {}
            });
            const pipeline = await codepipelineCalls.getPipeline('FakeName');
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('updatePipeline', () => {
        it('should update the pipeline', async () => {
            const pipelinePhases: AWS.CodePipeline.StageDeclaration[] = [];

            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves({
                Arn: 'FakeArn'
            });
            const updatePipelineStub = sandbox.stub(awsWrapper.codePipeline, 'updatePipeline').resolves({
                pipeline: {}
            });

            const pipeline = await codepipelineCalls.updatePipeline('my-app', 'my-pipeline', accountConfig, pipelinePhases, 'FakeBucket');
            expect(getRoleStub.callCount).to.equal(1);
            expect(updatePipelineStub.callCount).to.equal(1);
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('deletePipeline', () => {
        it('should delete the pipeline', async () => {
            const deletePipelineStub = sandbox.stub(awsWrapper.codePipeline, 'deletePipeline').resolves(true);

            const success = await codepipelineCalls.deletePipeline('FakeApp', 'FakePipeline');
            expect(success).to.equal(true);
        });
    });

    describe('putWebhook', () => {
        it('should put the webhook', async () => {
            const putWebhookStub = sandbox.stub(awsWrapper.codePipeline, 'putWebhook').resolves({
                webhook: {}
            });

            const webhookParam: AWS.CodePipeline.PutWebhookInput = {
                'webhook': {
                    'name': `pipelineprojectname-webhook`,
                    'targetPipeline': 'pipelineprojectname',
                    'targetAction': 'Github',
                    'filters': [
                        {
                            'jsonPath': '$.ref',
                            'matchEquals': 'refs/heads/{Branch}'
                        }
                    ],
                    'authentication': 'GITHUB_HMAC',
                    'authenticationConfiguration': {
                        'SecretToken': 'secret'
                    }
                }
            };

            const webhook = await codepipelineCalls.putWebhook(webhookParam);
            expect(putWebhookStub.callCount).to.equal(1);
        });
    });

    describe('deleteWebhook', () => {
        it('should delete the webhook', async () => {
            const deleteWebhookStub = sandbox.stub(awsWrapper.codePipeline, 'deleteWebhook').resolves({});

            const webhook = await codepipelineCalls.deleteWebhook('SomeWebhook');
            expect(deleteWebhookStub.callCount).to.equal(1);
        });
    });

    describe('registerWebhook', () => {
        it('should register the webhook', async () => {
            const registerWebhookStub = sandbox.stub(awsWrapper.codePipeline, 'registerWebhook').resolves({
                webhook: {}
            });

            const webhook = await codepipelineCalls.registerWebhook('SomeWebhook');
            expect(registerWebhookStub.callCount).to.equal(1);
        });
    });

    describe('deregisterWebhook', () => {
        it('should deregister the webhook', async () => {
            const deregisterWebhookStub = sandbox.stub(awsWrapper.codePipeline, 'deregisterWebhook').resolves({
                webhook: {}
            });

            const webhook = await codepipelineCalls.deregisterWebhook('SomeWebhook');
            expect(deregisterWebhookStub.callCount).to.equal(1);
        });
    });
});
