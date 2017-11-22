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
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as inquirer from 'inquirer';
import * as sinon from 'sinon';
import { PhaseConfig, PhaseContext } from '../../../src/datatypes';
import * as github from '../../../src/phases/github';
import { GithubConfig } from '../../../src/phases/github';

describe('github phase module', () => {
    let sandbox: sinon.SinonSandbox;
    const accountConfig: AccountConfig = {
        account_id: 111111111111,
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
    const githubConfig = {
        type: 'github',
        name: 'Source',
        owner: 'SomeOwner',
        repo: 'SomeRepo',
        branch: 'master'
    };
    const phaseContext = new PhaseContext<github.GithubConfig>(
        'myapp',
        'myphase',
        'github',
        'SomeBucket',
        'dev',
        accountConfig,
        githubConfig,
        {}
    );

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('check', () => {
        let phaseConfig: GithubConfig;

        beforeEach(() => {
            phaseConfig = {
                type: 'github',
                name: 'Check',
                repo: 'FakeRepo',
                branch: 'FakeBranch',
                owner: 'FakeOwner'
            };
        });

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

        it('should require the branch parameter', () => {
            delete phaseConfig.branch;
            const errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'branch' parameter is required`);
        });

        it('should work when all required parameters are provided', () => {
            const errors = github.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should prompt for a github access token', () => {
            const token = 'FakeToken';
            const promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({ githubAccessToken: token }));

            return github.getSecretsForPhase(githubConfig)
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
});
