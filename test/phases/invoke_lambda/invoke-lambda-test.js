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
const invokeLambda = require('../../../dist/phases/invoke_lambda');
const sinon = require('sinon');

describe('invoke lambda module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should return an error when function_name is not given', function() {
            let errors = invokeLambda.check({});
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("'function_name' parameter is required")
        });

        it('should return an empty array when required params present', function () {
            let errors = invokeLambda.check({
                function_name: 'FakeFunction'
            });
            expect(errors).to.deep.equal([]);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should do nothing', function () {
            return invokeLambda.getSecretsForPhase({})
                .then(results => {
                    expect(results).to.deep.equal({});
                });
        });
    });

    describe('deployPhase', function () {
        let phaseContext = {
            phaseName: 'MyPhase',
            params: {
                function_name: 'FakeFunction',
                function_parameters: {
                    FakeParameter: 'FakeParameterValue'
                }
            }
        }
        let accountConfig = {
            account_id: '111111111111',
            region: 'us-west-2'
        }

        it('should create the role, upload the file, and create the stack when it doesnt exist', function () {
            return invokeLambda.deployPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                    expect(phaseSpec.actions[0].configuration.FunctionName).to.equal("FakeFunction");
                    expect(phaseSpec.actions[0].configuration.UserParameters).to.equal(`{\"FakeParameter\":\"FakeParameterValue\"}`)
                });
        });
    });

    describe('deletePhase', function () {
        it('should do nothing', function () {
            return invokeLambda.deletePhase({}, {})
                .then(result => {
                    expect(result).to.deep.equal({});
                });
        });
    });

});