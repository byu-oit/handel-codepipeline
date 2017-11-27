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
import * as cloudformationCalls from '../../src/aws/cloudformation-calls';

describe('cloudformationCalls', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('getStack', () => {
        it('should return the stack if it exists', async () => {
            const stackName = 'FakeName';
            const describeStacksStub = sandbox.stub(awsWrapper.cloudFormation, 'describeStacks').resolves({
                Stacks: [{
                    StackName: stackName
                }]
            });

            const stack: any = await cloudformationCalls.getStack(stackName);
            expect(describeStacksStub.callCount).to.equal(1);
            expect(stack).to.not.equal(null);
            expect(stack.StackName).to.equal(stackName);
        });

        it('should return null if the stack doesnt exist', async () => {
            const stackName = 'FakeName';
            const describeStacksStub = sandbox.stub(awsWrapper.cloudFormation, 'describeStacks').resolves({
                code: 'ValidationError'
            });

            const stack = await cloudformationCalls.getStack(stackName);
            expect(describeStacksStub.callCount).to.equal(1);
            expect(stack).to.equal(null);
        });

        it('should throw an error if one occurs', async () => {
            const stackName = 'FakeName';
            const errorCode = 'InternalError';
            const describeStacksStub = sandbox.stub(awsWrapper.cloudFormation, 'describeStacks').rejects({
                code: errorCode
            });

            try {
                const stack = await cloudformationCalls.getStack(stackName);
                expect(true).to.equal(false); // Should not get here
            }
            catch (err) {
                expect(describeStacksStub.callCount).to.equal(1);
                expect(err.code).to.equal(errorCode);
            }
        });
    });

    describe('waitForStack', () => {
        it('should wait for the stack', async () => {
            const stackName = 'FakeStack';
            const waitForStub = sandbox.stub(awsWrapper.cloudFormation, 'waitFor').resolves({
                Stacks: [{
                    StackName: stackName
                }]
            });

            const stack: any = await cloudformationCalls.waitForStack(stackName, 'stackUpdateComplete');
            expect(waitForStub.callCount).to.equal(1);
            expect(stack.StackName).to.equal(stackName);
        });
    });

    describe('createStack', () => {
        it('should create the stack, wait for it to finish, and return the created stack', async () => {
            const stackName = 'FakeStack';
            const createStackStub = sandbox.stub(awsWrapper.cloudFormation, 'createStack').resolves({});
            const waitForStackStub = sandbox.stub(cloudformationCalls, 'waitForStack').returns(Promise.resolve({
                StackName: stackName
            }));

            const stack = await cloudformationCalls.createStack(stackName, 'FakeTemplateBody', []);
            expect(stack.StackName).to.equal(stackName);
            expect(createStackStub.callCount).to.equal(1);
            expect(waitForStackStub.callCount).to.equal(1);
        });
    });

    describe('deleteStack', () => {
        it('should delete the stack', async () => {
            const deleteStackStub = sandbox.stub(awsWrapper.cloudFormation, 'deleteStack').resolves({});
            const waitForStub = sandbox.stub(awsWrapper.cloudFormation, 'waitFor').resolves({});

            const result = await cloudformationCalls.deleteStack('FakeStack');
            expect(deleteStackStub.callCount).to.equal(1);
            expect(waitForStub.callCount).to.equal(1);
            expect(result).to.equal(true);
        });
    });

    describe('getCfStyleStackParameters', () => {
        it('should take an object of key/value pairs and return them in CloudFormations param format', () => {
            const object = {
                SomeParam: 'SomeValue'
            };

            const cloudFormationParams = cloudformationCalls.getCfStyleStackParameters(object);
            expect(cloudFormationParams.length).to.equal(1);
            expect(cloudFormationParams[0].ParameterKey).to.equal('SomeParam');
            expect(cloudFormationParams[0].ParameterValue).to.equal('SomeValue');
        });
    });

    describe('getOutput', () => {
        it('should get the given output from the CF stack if present', () => {
            const key = 'FakeKey';
            const value = 'FakeValue';
            const stack = {
                Outputs: [{
                    OutputKey: key,
                    OutputValue: value
                }]
            };

            const output = cloudformationCalls.getOutput(key, stack);
            expect(output).to.equal(value);
        });

        it('should return null for the given output if not present', () => {
            const stack = {
                Outputs: []
            };

            const output = cloudformationCalls.getOutput('FakeKey', stack);
            expect(output).to.equal(null);
        });
    });
});
