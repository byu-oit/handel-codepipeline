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
import * as util from '../../../src/common/util';
import { PhaseConfig, PhaseContext } from '../../../src/datatypes/index';
import * as cloudformation from '../../../src/phases/cloudformation';

describe('cloudformation module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;
    let phaseConfig: cloudformation.CloudformationConfig;
    let phaseContext: PhaseContext<cloudformation.CloudformationConfig>;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'cloudformation',
            name: 'Deploy',
            template_path: 'FakePath',
            deploy_role: 'FakeRole'
        };

        phaseContext = new PhaseContext<cloudformation.CloudformationConfig>(
            'myapp',
            'myphase',
            'cloudformation',
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
        it('should require the deploy_role parameter', () => {
            delete phaseConfig.deploy_role;
            const errors = cloudformation.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain(`'deploy_role' parameter is required`);
        });

        it('should require the template_path parameter', () => {
            delete phaseConfig.template_path;
            const errors = cloudformation.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain(`'template_path' parameter is required`);
        });

        it('should return no errors when all required params are present', () => {
            const errors = cloudformation.check(phaseConfig);
            expect(errors).to.deep.equal([]);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should not prompt for any secrets', async () => {
            const results = await cloudformation.getSecretsForPhase(phaseConfig);
            expect(results).to.deep.equal({});
        });
    });

    describe('deployPhase', () => {
        it('should return the configuration for the phase', async () => {
            const phaseSpec = await cloudformation.deployPhase(phaseContext, accountConfig);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', async () => {
            const result = await cloudformation.deletePhase(phaseContext, accountConfig);
            expect(result).to.deep.equal(true);
        });
    });
});
