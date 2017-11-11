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
const ssmCalls = require('../../dist/aws/ssm-calls');
const expect = require('chai').expect;
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');

describe('ssm calls', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
        AWS.restore('SSM');
    });

    describe('putParameter', function () {
        it('should create the parameter', function () {
            let paramName = "FakeParam"
            let paramType = "String"
            let paramValue = "FakeValue"
            let paramDescription = "FakeDescription"
            AWS.mock('SSM', 'putParameter', Promise.resolve({
                param: {}
            }));

            return ssmCalls.putParameter(paramName, paramType, paramValue, paramDescription)
                .then(param => {
                    expect(param).to.deep.equal({param: {} });
                })
        });
    });

    //failing for missing region? but functions in full end to end test
    describe('deleteParameter', function () {
        it('should create the parameter', function () {
            let paramName = "FakeParam"
            AWS.mock('SSM', 'deleteParameter', Promise.resolve({}));

            return ssmCalls.deleteParameter(paramName)
                .then(param => {
                    expect(param).to.deep.equal({});
                })
        });
    });

    describe('deleteParameters', function () {
        it('should delete the parameters', function () {
            let names = ['FakeParam', 'FakeParam2'];
            AWS.mock('SSM', 'deleteParameters', Promise.resolve({}));

            return ssmCalls.deleteParameters(names)
                .then(deletedParams => {
                    expect(deletedParams).to.deep.equal({})
                })
        });
    });
});