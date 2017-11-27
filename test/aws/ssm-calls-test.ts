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
import * as sinon from 'sinon';
import awsWrapper from '../../src/aws/aws-wrapper';
import * as ssmCalls from '../../src/aws/ssm-calls';

describe('ssm calls', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('putParameter', () => {
        it('should create the parameter', async () => {
            const paramName = 'FakeParam';
            const paramType = 'String';
            const paramValue = 'FakeValue';
            const paramDescription = 'FakeDescription';
            const putParameterStub = sandbox.stub(awsWrapper.ssm, 'putParameter').resolves({
                param: {}
            });

            const param = await ssmCalls.putParameter(paramName, paramType, paramValue, paramDescription)
            expect(param).to.deep.equal({param: {} });
            expect(putParameterStub.callCount).to.equal(1);
        });
    });

    // failing for missing region? but functions in full end to end test
    describe('deleteParameter', () => {
        it('should create the parameter', async () => {
            const paramName = 'FakeParam';
            const deleteParameterStub = sandbox.stub(awsWrapper.ssm, 'deleteParameter').resolves({});

            const param = await ssmCalls.deleteParameter(paramName);
            expect(deleteParameterStub.callCount).to.equal(1);
            expect(param).to.deep.equal({});
        });
    });

    describe('deleteParameters', () => {
        it('should delete the parameters', async () => {
            const names = ['FakeParam', 'FakeParam2'];
            const deleteParametersStub = sandbox.stub(awsWrapper.ssm, 'deleteParameters').resolves({});

            const deletedParams = await ssmCalls.deleteParameters(names);
            expect(deleteParametersStub.callCount).to.equal(1);
            expect(deletedParams).to.deep.equal({});
        });
    });
});
