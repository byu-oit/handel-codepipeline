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
import * as codepipelineCalls from '../../../src/aws/codepipeline-calls';
import * as util from '../../../src/common/util';
import { PhaseConfig, PhaseContext } from '../../../src/datatypes';
import * as github from '../../../src/phases/github';
import { GithubConfig } from '../../../src/phases/github';

describe('github phase module', () => {
    let accountConfig: AccountConfig;
    let phaseConfig: github.GithubConfig;
    let phaseContext: PhaseContext<github.GithubConfig>;

    beforeEach(() => {
        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'github',
            name: 'Source',
            owner: 'SomeOwner',
            repo: 'SomeRepo',
            branch: 'master'
        };

        phaseContext = new PhaseContext<github.GithubConfig>(
            'myapp',
            'myphase',
            'github',
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
        it('should require the owner parameter', () => {
            delete phaseConfig.owner;
            const errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'owner' parameter is required`);
        });

        it('should require the repo parameter', () => {
            delete phaseConfig.repo;
            const errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'repo' parameter is required`);
        });

        it('should work when all required parameters are provided', () => {
            const errors = github.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for a github access token', () => {
            const token = 'FakeToken';
            const promptStub = sinon.stub(inquirer, 'prompt').returns(Promise.resolve({ githubAccessToken: token }));

            return github.getSecretsForPhase(phaseConfig)
                .then(results => {
                    expect(promptStub.callCount).to.equal(1);
                    expect(results.githubAccessToken).to.equal(token);
                });
        });
    });

    describe('deployPhase', () => {
        it('should return the github phase config', () => {
            return github.deployPhase(phaseContext, accountConfig)
                .then(phase => {
                    expect(phase.name).to.equal(phaseContext.phaseName);
                });
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', () => {
            return github.deletePhase(phaseContext, accountConfig)
                .then(result => {
                    expect(result).to.deep.equal({});
                });
        });
    });

    describe('addWebhook', () => {
        it('should put webhook and register it', async () => {
            const putWebhookStub = sinon.stub(codepipelineCalls, 'putWebhook');
            const registerWebhookStub = sinon.stub(codepipelineCalls, 'registerWebhook');
            const listWebhookStub = sinon.stub(codepipelineCalls, 'listWebhooks').returns(Promise.resolve({ webhooks: []}));
            await github.addWebhook(phaseContext);
            expect(putWebhookStub.callCount).to.equal(1);
            expect(registerWebhookStub.callCount).to.equal(1);
            expect(listWebhookStub.callCount).to.equal(1);
        });

        it('should skip if webhook exists', async () => {
            const putWebhookStub = sinon.stub(codepipelineCalls, 'putWebhook');
            const registerWebhookStub = sinon.stub(codepipelineCalls, 'registerWebhook');
            const listWebhookStub = sinon.stub(codepipelineCalls, 'listWebhooks').returns(Promise.resolve({ webhooks: [{definition: {name: 'myapp-dev-webhook'}}] }));
            await github.addWebhook(phaseContext);
            expect(putWebhookStub.callCount).to.equal(0);
            expect(registerWebhookStub.callCount).to.equal(0);
            expect(listWebhookStub.callCount).to.equal(1);
        });

        it('should put if webhook doenst match', async () => {
            const putWebhookStub = sinon.stub(codepipelineCalls, 'putWebhook');
            const registerWebhookStub = sinon.stub(codepipelineCalls, 'registerWebhook');
            const listWebhookStub = sinon.stub(codepipelineCalls, 'listWebhooks').returns(Promise.resolve({ webhooks: [{ definition: { name: 'myapp-prd-webhook' } }] }));
            await github.addWebhook(phaseContext);
            expect(putWebhookStub.callCount).to.equal(1);
            expect(registerWebhookStub.callCount).to.equal(1);
            expect(listWebhookStub.callCount).to.equal(1);
        });
    });

    describe('removeWebhook', () => {
        it('if webhook exists, should deregister webhook and delete it', async () => {
            const webhookExistsStub = sinon.stub(codepipelineCalls, 'webhookExists').returns(Promise.resolve(true));
            const deleteWebhookStub = sinon.stub(codepipelineCalls, 'deleteWebhook');
            const deregisterWebhookStub = sinon.stub(codepipelineCalls, 'deregisterWebhook');
            await github.removeWebhook(phaseContext);
            expect(webhookExistsStub.callCount).to.equal(1);
            expect(deleteWebhookStub.callCount).to.equal(1);
            expect(deregisterWebhookStub.callCount).to.equal(1);
        });
        it('if webhook doesn\'t exist, should not try to deregister or delete webhook', async () => {
            const webhookExistsStub = sinon.stub(codepipelineCalls, 'webhookExists').returns(Promise.resolve(false));
            const deleteWebhookStub = sinon.stub(codepipelineCalls, 'deleteWebhook');
            const deregisterWebhookStub = sinon.stub(codepipelineCalls, 'deregisterWebhook');
            await github.removeWebhook(phaseContext);
            expect(webhookExistsStub.callCount).to.equal(1);
            expect(deleteWebhookStub.callCount).to.equal(0);
            expect(deregisterWebhookStub.callCount).to.equal(0);
        });
    });
});
