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
import * as sinon from 'sinon';
import * as codebuildCalls from '../../../src/aws/codebuild-calls';
import * as iamCalls from '../../../src/aws/iam-calls';
import * as util from '../../../src/common/util';
import { PhaseContext } from '../../../src/datatypes/index';
import * as handel from '../../../src/phases/handel';

describe('handel phase module', () => {
    let accountConfig: AccountConfig;
    let phaseConfig: handel.HandelConfig;
    let phaseContext: PhaseContext<handel.HandelConfig>;

    beforeEach(() => {
        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'handel',
            name: 'Deploy',
            environments_to_deploy: [
                'dev'
            ]
        };

        phaseContext = new PhaseContext<handel.HandelConfig>(
            'myapp',
            'myphase',
            'handel',
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
        it('should require the environments_to_deploy parameter', () => {
            delete phaseConfig.environments_to_deploy;
            const errors = handel.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'environments_to_deploy' parameter is required`);
        });

        it('should work when all required parameters are provided', () => {
            const errors = handel.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should return an empty object', async () => {
            const results = await handel.getSecretsForPhase(phaseConfig);
            expect(results).to.deep.equal({});
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

            const phase = await handel.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(createProjectStub.callCount).to.equal(1);
        });

        it('should update the project when it already exists', async () => {
            const createOrUpdateRoleStub = sinon.stub(iamCalls, 'createOrUpdateRoleAndPolicy').resolves(role);
            const getProjectStub = sinon.stub(codebuildCalls, 'getProject').resolves({});
            const updateProjectStub = sinon.stub(codebuildCalls, 'updateProject').resolves({});

            const phase = await handel.deployPhase(phaseContext, accountConfig);
            expect(createOrUpdateRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(updateProjectStub.callCount).to.equal(1);
        });
    });

    describe('deletePhase', () => {
        it('should delete the codebuild project', async () => {
            const deleteProjectStub = sinon.stub(codebuildCalls, 'deleteProject').resolves(true);

            const result = await handel.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
            expect(deleteProjectStub.callCount).to.equal(1);
        });
    });
});
