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
import * as npm from '../../../src/phases/npm';

describe('npm phase module', () => {
    let accountConfig: AccountConfig;
    let phaseConfig: npm.NpmConfig;
    let phaseContext: PhaseContext<npm.NpmConfig>;

    beforeEach(() => {
        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'npm',
            name: 'Publish',
            build_image: 'FakeImage'
        };

        phaseContext = new PhaseContext<npm.NpmConfig>(
            'myapp',
            'myphase',
            'npm',
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
        it('should work when all required parameters are provided', () => {
            const errors = npm.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for a npm Username', async () => {
            const token = 'FakeUser';
            const promptStub = sinon.stub(inquirer, 'prompt').returns(Promise.resolve({ npmToken: token }));

            const results = await npm.getSecretsForPhase(phaseConfig);
            expect(results.npmToken).to.equal(token);
            expect(promptStub.callCount).to.equal(1);
        });
    });

    describe('deployPhase', () => {
        const role = {
            Arn: 'FakeArn'
        };

        it('should create the codebuild project and return the phase config', async () => {
            const createOrUpdateRoleStub = sinon.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const getProjectStub = sinon.stub(codebuildCalls, 'getProject').resolves(null);
            const createProjectStub = sinon.stub(codebuildCalls, 'createProject').resolves({});
            const putParameterStub = sinon.stub(ssmCalls, 'putParameter').resolves({});

            await npm.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(createProjectStub.callCount).to.equal(1);
            expect(putParameterStub.callCount).to.equal(1);
        });

        it('should update the project when it already exists', async () => {
            const createOrUpdateRoleStub = sinon.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const getProjectStub = sinon.stub(codebuildCalls, 'getProject').resolves({});
            const updateProjectStub = sinon.stub(codebuildCalls, 'updateProject').resolves({});
            const putParameterStub = sinon.stub(ssmCalls, 'putParameter').resolves({});

            await npm.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(updateProjectStub.callCount).to.equal(1);
            expect(putParameterStub.callCount).to.equal(1);
        });
    });

    describe('deletePhase', () => {
        it('should delete the codebuild project', async () => {
            const deleteProjectStub = sinon.stub(codebuildCalls, 'deleteProject').returns(Promise.resolve(true));
            const deletePrarameterStub = sinon.stub(ssmCalls, 'deleteParameter').returns(Promise.resolve(true));
            const detachPolicyStub = sinon.stub(iamCalls, 'detachPolicyFromRole').resolves(true);
            const deleteRoleStub = sinon.stub(iamCalls, 'deleteRole').resolves(true);
            const deletePolicyStub = sinon.stub(iamCalls, 'deletePolicy').resolves(true);

            const result = await npm.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
            expect(deleteProjectStub.callCount).to.equal(1);
            expect(detachPolicyStub.callCount).to.equal(1);
            expect(deletePolicyStub.callCount).to.equal(1);
            expect(deleteRoleStub.callCount).to.equal(1);
            expect(deletePrarameterStub.callCount).to.equal(1);
        });
    });
});
