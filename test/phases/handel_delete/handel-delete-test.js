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
const handelDelete = require('../../../dist/phases/handel_delete');
const expect = require('chai').expect;
const sinon = require('sinon');
const iamCalls = require('../../../dist/aws/iam-calls');
const codebuildCalls = require('../../../dist/aws/codebuild-calls');

describe('handel phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the environments_to_delete parameter', function () {
            let phaseConfig = {};
            let errors = handelDelete.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'environments_to_delete' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                environments_to_delete: ['dev']
            };
            let errors = handelDelete.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should return an empty object', function () {
            return handelDelete.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                });
        });
    });

    describe('deployPhase', function () {
        let phaseContext = {
            appName: 'myApp',
            accountConfig: {
                account_id: 111111111111
            },
            params: {
                environments_to_delete: ['dev']
            }
        }

        let role = {
            Arn: "FakeArn"
        }

        it('should create the codebuild project and return the phase config', function () {
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve(null));
            let createProjectStub = sandbox.stub(codebuildCalls, 'createProject').returns(Promise.resolve)

            return handelDelete.deployPhase(phaseContext, {})
                .then(phase => {
                    expect(createRoleStub.callCount).to.equal(1);
                    expect(createPolicyStub.callCount).to.equal(1);
                    expect(attachPolicyStub.callCount).to.equal(1);
                    expect(getRoleStub.callCount).to.equal(1);
                    expect(getProjectStub.callCount).to.equal(1);
                    expect(createProjectStub.callCount).to.equal(1);
                });
        });

        it('should update the project when it already exists', function () {
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve({}));
            let updateProjectStub = sandbox.stub(codebuildCalls, 'updateProject').returns(Promise.resolve)

            return handelDelete.deployPhase(phaseContext, {})
                .then(phase => {
                    expect(createRoleStub.callCount).to.equal(1);
                    expect(createPolicyStub.callCount).to.equal(1);
                    expect(attachPolicyStub.callCount).to.equal(1);
                    expect(getRoleStub.callCount).to.equal(1);
                    expect(getProjectStub.callCount).to.equal(1);
                    expect(updateProjectStub.callCount).to.equal(1);
                });
        })
    });

    describe('deletePhase', function () {
        let phaseContext = {
            phaseName: 'FakePhase',
            appName: 'FakeApp',
            params: {
                environments_to_delete: ['dev']
            }
        }
        it('should delete the codebuild project', function () {
            let deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').returns(Promise.resolve(true))
            return handelDelete.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.be.true;
                    expect(deleteProjectStub.callCount).to.equal(1);
                });
        });
    });
});