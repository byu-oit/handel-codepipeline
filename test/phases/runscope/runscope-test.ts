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
import { PhaseConfig, PhaseContext } from '../../../src/datatypes/index';
import * as runscope from '../../../src/phases/runscope';

describe('runscope module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;
    let phaseConfig: PhaseConfig;
    let phaseContext: PhaseContext<PhaseConfig>;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'runscope',
            name: 'MyTests'
        };

        phaseContext = new PhaseContext<PhaseConfig>(
            'myapp',
            'myphase',
            'runscope',
            'SomeBucket',
            'dev',
            accountConfig,
            phaseConfig,
            {}
        );
});

    afterEach(() => {
        sandbox.restore();
    });

    describe('check', () => {
        it('should return an empty array', () => {
            const errors = runscope.check(phaseConfig);
            expect(errors).to.deep.equal([]);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for the trigger URL and auth token', async () => {
            const triggerUrl = 'FakeUrl';
            const accessToken = 'FakeToken';

            const promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
                runscopeTriggerUrl: triggerUrl,
                runscopeAccessToken: accessToken
            }));

            const results = await runscope.getSecretsForPhase(phaseConfig);
            expect(results.runscopeTriggerUrl).to.equal(triggerUrl);
            expect(results.runscopeAccessToken).to.equal(accessToken);
            expect(promptStub.callCount).to.equal(1);
        });
    });

    describe('deployPhase', () => {
        it('should create the role, upload the file, and create the stack when it doesnt exist', async () => {
            const functionName = 'MyFunction';
            const getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve(null));
            const createLambdaRoleStub = sandbox.stub(deployersCommon, 'createLambdaCodePipelineRole').returns(Promise.resolve({
                Arn: 'fakeArn'
            }));
            const uploadDirectoryStub = sandbox.stub(deployersCommon, 'uploadDirectoryToBucket').returns(Promise.resolve({
                Bucket: 'fakeBucket',
                Key: 'fakeKey'
            }));
            const createStackStub = sandbox.stub(cloudFormationCalls, 'createStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            const phaseSpec = await runscope.deployPhase(phaseContext, accountConfig);
            expect(getStackStub.callCount).to.equal(1);
            expect(createLambdaRoleStub.callCount).to.equal(1);
            expect(uploadDirectoryStub.callCount).to.equal(1);
            expect(createStackStub.callCount).to.equal(1);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
            expect(phaseSpec.actions[0]!.configuration!.FunctionName).to.equal(functionName);
        });

        it('should return the stack when it exists', async () => {
            const functionName = 'MyFunction';
            const getStackStub = sandbox.stub(cloudFormationCalls, 'getStack').returns(Promise.resolve({
                Outputs: [{
                    OutputKey: 'FunctionName',
                    OutputValue: functionName
                }]
            }));

            const phaseSpec = await runscope.deployPhase(phaseContext, accountConfig);
            expect(getStackStub.callCount).to.equal(1);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
            expect(phaseSpec.actions[0]!.configuration!.FunctionName).to.equal(functionName);
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', async () => {
            const result = await runscope.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
        });
    });
});
