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
import * as iamCalls from '../../src/aws/iam-calls';

describe('iam calls', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('createRole', () => {
        it('should create the role', async () => {
            const roleName = 'FakeRole';
            const createRoleStub = sandbox.stub(awsWrapper.iam, 'createRole').resolves({
                Role: {}
            });

            const role = await iamCalls.createRole(roleName, ['SomeTrustedService']);
            expect(createRoleStub.callCount).to.equal(1);
            expect(role).to.deep.equal({});
        });
    });

    describe('getRole', () => {
        it('should return the role when it exists', async () => {
            const getRoleStub = sandbox.stub(awsWrapper.iam, 'getRole').resolves({
                Role: {}
            });

            const role = await iamCalls.getRole('FakeRole');
            expect(getRoleStub.callCount).to.equal(1);
            expect(role).to.deep.equal({});
        });

        it('should return null when the role doesnt exist', async () => {
            const getRoleStub = sandbox.stub(awsWrapper.iam, 'getRole').rejects({
                code: 'NoSuchEntity'
            });

            const role = await iamCalls.getRole('FakeRole');
            expect(getRoleStub.callCount).to.equal(1);
            expect(role).to.equal(null);
        });

        it('should throw an error on any other error', async () => {
            const errorCode = 'OtherError';
            const getRoleStub = sandbox.stub(awsWrapper.iam, 'getRole').rejects({
                code: errorCode
            });

            try {
                const role = await iamCalls.getRole('FakeRole');
                expect(true).to.equal(false); // Should not get here
            }
            catch (err) {
                expect(getRoleStub.callCount).to.equal(1);
                expect(err.code).to.equal(errorCode);
            }
        });
    });

    describe('createRoleIfNotExists', () => {
        it('should create the role when it doesnt exist', async () => {
            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(null);
            const createRoleStub = sandbox.stub(iamCalls, 'createRole').resolves({});

            const role = await iamCalls.createRoleIfNotExists('FakeRole', ['TrustedService']);
            expect(getRoleStub.callCount).to.equal(1);
            expect(createRoleStub.callCount).to.equal(1);
            expect(role).to.deep.equal({});
        });

        it('should just return the role when it already exists', async () => {
            const getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve({}));

            const role = await iamCalls.createRoleIfNotExists('FakeRole', ['TrustedService']);
            expect(getRoleStub.callCount).to.equal(1);
            expect(role).to.deep.equal({});
        });
    });

    describe('attachPolicyToRole', () => {
        it('should attach the policy to the role', async () => {
            const attachPolicyStub = sandbox.stub(awsWrapper.iam, 'attachRolePolicy').resolves({});

            const response = await iamCalls.attachPolicyToRole('FakeArn', 'FakeRole');
            expect(attachPolicyStub.callCount).to.equal(1);
            expect(response).to.deep.equal({});
        });
    });

    describe('getPolicy', () => {
        it('should return the policy when it exists', async () => {
            const getPolicyStub = sandbox.stub(awsWrapper.iam, 'getPolicy').resolves({
                Policy: {}
            });

            const policy = await iamCalls.getPolicy('FakeArn');
            expect(getPolicyStub.callCount).to.equal(1);
            expect(policy).to.deep.equal({});
        });

        it('should return null when the policy doesnt exist', async () => {
            const getPolicyStub = sandbox.stub(awsWrapper.iam, 'getPolicy').rejects({
                code: 'NoSuchEntity'
            });

            const policy = await iamCalls.getPolicy('FakeArn');
            expect(getPolicyStub.callCount).to.equal(1);
            expect(policy).to.equal(null);
        });
    });

    describe('createPolicy', () => {
        it('should create the policy', async () => {
            const createPolicyStub = sandbox.stub(awsWrapper.iam, 'createPolicy').resolves({
                Policy: {}
            });

            const policy = await iamCalls.createPolicy('PolicyName', {});
            expect(createPolicyStub.callCount).to.equal(1);
            expect(policy).to.deep.equal({});
        });
    });

    describe('createPolicyIfNotExists', () => {
        it('should create the policy when it doesnt exist', async () => {
            const getPolicyStub = sandbox.stub(iamCalls, 'getPolicy').resolves(null);
            const createPolicyStub = sandbox.stub(iamCalls, 'createPolicy').resolves({});

            const policy = await iamCalls.createPolicyIfNotExists('FakePolicy', 'FakeArn', {});
            expect(policy).to.deep.equal({});
            expect(getPolicyStub.callCount).to.equal(1);
            expect(createPolicyStub.callCount).to.equal(1);
        });

        it('should just return the policy when it exists', async () => {
            const getPolicyStub = sandbox.stub(iamCalls, 'getPolicy').resolves({});
            const createPolicyStub = sandbox.stub(iamCalls, 'createPolicy').resolves({});

            const policy = await iamCalls.createPolicyIfNotExists('FakePolicy', 'FakeArn', {});
            expect(policy).to.deep.equal({});
            expect(getPolicyStub.callCount).to.equal(1);
            expect(createPolicyStub.callCount).to.equal(0);
        });
    });

    describe('deleteRole', () => {
        it('should return true when deletion succeeds', async () => {
            const deleteRoleStub = sandbox.stub(awsWrapper.iam, 'deleteRole').resolves(true);

            const result = await iamCalls.deleteRole('FakeRoleName');
            expect(result).to.equal(true);
            expect(deleteRoleStub.callCount).to.equal(1);
        });

        it('should return false when deletion fails', async () => {
            const deleteRoleStub = sandbox.stub(awsWrapper.iam, 'deleteRole').rejects(new Error());

            const result = await iamCalls.deleteRole('FakeRoleName');
            expect(result).to.equal(false);
            expect(deleteRoleStub.callCount).to.equal(1);
        });
    });

    describe('detachPolicyFromRole', () => {
        it('should return true when detach succeeds', async () => {
            const detachPolicyStub = sandbox.stub(awsWrapper.iam, 'detachRolePolicy').resolves(true);

            const result = await iamCalls.detachPolicyFromRole('FakeRoleName', 'FakePolicyArn');
            expect(result).to.equal(true);
            expect(detachPolicyStub.callCount).to.equal(1);
        });

        it('should return false when detach fails', async () => {
            const detachPolicyStub = sandbox.stub(awsWrapper.iam, 'detachRolePolicy').rejects(new Error());

            const result = await iamCalls.detachPolicyFromRole('FakeRoleName', 'FakePolicyArn');
            expect(result).to.equal(false);
            expect(detachPolicyStub.callCount).to.equal(1);
        });
    });

    describe('deletePolicy', () => {
        it('should return true when deletion succeeds', async () => {
            const deletePolicyStub = sandbox.stub(awsWrapper.iam, 'deletePolicy').resolves(true);

            const result = await iamCalls.deletePolicy('FakePolicyArn');
            expect(result).to.equal(true);
            expect(deletePolicyStub.callCount).to.equal(1);
        });

        it('should return false when deletion fails', async () => {
            const deletePolicyStub = sandbox.stub(awsWrapper.iam, 'deletePolicy').rejects(new Error());

            const result = await iamCalls.deletePolicy('FakePolicyArn');
            expect(result).to.equal(false);
            expect(deletePolicyStub.callCount).to.equal(1);
        });
    });
});
