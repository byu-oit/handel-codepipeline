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
const expect = require('chai').expect;
const approval = require('../../../lib/phases/approval');
const sinon = require('sinon');
const inquirer = require('inquirer');

describe('approval module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('check', function() {
        it('should return an empty array', function() {
            let errors = approval.check({});
            expect(errors).to.deep.equal([]);
        })
    });

    describe('getSecretsForPhase', function() {
        it('should not prompt for any secrets', function() {
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({}));

            return approval.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                    expect(promptStub.callCount).to.equal(0);
                });
        });
    });

    describe('createPhase', function() {
        let phaseContext = {
            phaseName: 'MyPhase',
            params: {},
            secrets: {}
        }
        let accountConfig = {
            account_id: '111111111111',
            region: 'us-west-2'
        }

        it('should return the configuration for the phase', function() {
            return approval.createPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                }); 
        });
    });

    describe('deletePhase', function() {
        it('should do nothing', function() {
            return approval.deletePhase({}, {})
                .then(result => {
                    expect(result).to.deep.equal({});
                })
        });
    });

});