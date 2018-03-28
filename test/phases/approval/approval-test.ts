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
import { PhaseConfig, PhaseContext } from '../../../src/datatypes/index';
import * as approval from '../../../src/phases/approval';

describe('approval module', () => {
    let sandbox: sinon.SinonSandbox;

    const accountConfig: AccountConfig = {
        account_id: '111111111111',
        region: 'us-west-2',
        vpc: 'vpc-1111111',
        public_subnets: [
            'subnet-aaaaaaa',
            'subnet-bbbbbbb'
        ],
        private_subnets: [
            'subnet-aaaaaaa',
            'subnet-bbbbbbb'
        ],
        data_subnets: [
            'subnet-aaaaaaa',
            'subnet-bbbbbbb'
        ],
        ssh_bastion_sg: 'sg-4444444444',
        elasticache_subnet_group: 'elasticache-group-name',
        rds_subnet_group: 'rds-group-name',
        redshift_subnet_group: 'redshift-group-name'
    };

    const phaseConfig = {
        type: 'approval',
        name: 'Source'
    };

    const phaseContext = new PhaseContext<PhaseConfig>(
        'myapp',
        'myphase',
        'approval',
        'SomeBucket',
        'dev',
        accountConfig,
        phaseConfig,
        {}
    );

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('check', () => {
        it('should return an empty array', () => {
            const errors = approval.check(phaseConfig);
            expect(errors).to.deep.equal([]);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should not prompt for any secrets', async () => {
            const promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({}));

            const results = await approval.getSecretsForPhase(phaseConfig);
            expect(results).to.deep.equal({});
            expect(promptStub.callCount).to.equal(0);
        });
    });

    describe('deployPhase', () => {
        it('should return the configuration for the phase', async () => {
            const phaseSpec = await approval.deployPhase(phaseContext, accountConfig);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', async () => {
            const result = await approval.deletePhase(phaseContext, accountConfig);
            expect(result).to.deep.equal(true);
        });
    });
});
