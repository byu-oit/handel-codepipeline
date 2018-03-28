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
import * as codebuildCalls from '../../../src/aws/codebuild-calls';
import * as iamCalls from '../../../src/aws/iam-calls';
import * as ssmCalls from '../../../src/aws/ssm-calls';
import * as util from '../../../src/common/util';
import { PhaseContext } from '../../../src/datatypes/index';
import * as pypi from '../../../src/phases/pypi';

describe('pypi phase module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;
    let phaseConfig: pypi.PypiConfig;
    let phaseContext: PhaseContext<pypi.PypiConfig>;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'pypi',
            name: 'Publish',
            server: 'pypi',
            build_image: 'FakeImage'
        };

        phaseContext = new PhaseContext<pypi.PypiConfig>(
            'myapp',
            'myphase',
            'pypi',
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
        it('should work when all required parameters are provided', () => {
            const errors = pypi.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for a pypi Username', async () => {
            const user = 'FakeUser';
            const password = 'FakePassword';
            const promptStub = sandbox.stub(inquirer, 'prompt').resolves({ pypiUsername: user, pypiPassword: password });

            const results = await pypi.getSecretsForPhase(phaseConfig);
            expect(results.pypiUsername).to.equal(user);
            expect(results.pypiPassword).to.equal(password);
            expect(promptStub.callCount).to.equal(1);
        });
    });

    describe('deployPhase', () => {
        const role = {
            Arn: 'FakeArn'
        };

        it('should create the codebuild project and return the phase config', async () => {
            const createOrUpdateRoleStub = sandbox.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves(null);
            const createProjectStub = sandbox.stub(codebuildCalls, 'createProject').resolves({});
            const putParameterStub = sandbox.stub(ssmCalls, 'putParameter').resolves({});

            await pypi.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(createProjectStub.callCount).to.equal(1);
            expect(putParameterStub.callCount).to.equal(3);
        });

        it('should update the project when it already exists', async () => {
            const createOrUpdateRoleStub = sandbox.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves({});
            const updateProjectStub = sandbox.stub(codebuildCalls, 'updateProject').resolves({});
            const putParameterStub = sandbox.stub(ssmCalls, 'putParameter').resolves({});

            await pypi.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(updateProjectStub.callCount).to.equal(1);
            expect(putParameterStub.callCount).to.equal(3);
        });
    });

    describe('deletePhase', () => {
        it('should delete the codebuild project', async () => {
            const deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').resolves(true);
            const deleteParametersStub = sandbox.stub(ssmCalls, 'deleteParameters').resolves(true);
            const detachPolicyStub = sandbox.stub(iamCalls, 'detachPolicyFromRole').resolves(true);
            const deleteRoleStub = sandbox.stub(iamCalls, 'deleteRole').resolves(true);
            const deletePolicyStub = sandbox.stub(iamCalls, 'deletePolicy').resolves(true);

            const result = await pypi.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
            expect(deleteProjectStub.callCount).to.equal(1);
            expect(detachPolicyStub.callCount).to.equal(1);
            expect(deletePolicyStub.callCount).to.equal(1);
            expect(deleteRoleStub.callCount).to.equal(1);
            expect(deleteParametersStub.callCount).to.equal(1);
        });
    });
});
