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
const npm = require('../../../dist/phases/npm');
const expect = require('chai').expect;
const sinon = require('sinon');
const iamCalls = require('../../../dist/aws/iam-calls');
const ssmCalls = require('../../../dist/aws/ssm-calls');
const codebuildCalls = require('../../../dist/aws/codebuild-calls');
const inquirer = require('inquirer');

describe('npm phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should work when all required parameters are provided', function () {
            let phaseConfig = {};
            let errors = npm.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should prompt for a npm Username', function () {
            let token = "FakeUser";
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({ npmToken: token }));

            return npm.getSecretsForPhase({ name: 'FakePhaseName'})
                .then(results => {
                    expect(results.npmToken).to.equal(token);
                    expect(promptStub.callCount).to.equal(1);
                });
        });
    });

    describe('deployPhase', function () {
        let phaseContext = {
            appName: 'myApp',
            accountConfig: {
                account_id: 111111111111
            },
            params: {},
            secrets: {}
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
            let putParameterStub = sandbox.stub(ssmCalls, 'putParameter').returns(Promise.resolve({}));

            return npm.deployPhase(phaseContext, {})
                .then(() => {
                    expect(createRoleStub.callCount).to.equal(1);
                    expect(createPolicyStub.callCount).to.equal(1);
                    expect(attachPolicyStub.callCount).to.equal(1);
                    expect(getRoleStub.callCount).to.equal(1);
                    expect(getProjectStub.callCount).to.equal(1);
                    expect(createProjectStub.callCount).to.equal(1);
                    expect(putParameterStub.callCount).to.equal(1);
                });
        });

        it('should update the project when it already exists', function () {
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve({}));
            let updateProjectStub = sandbox.stub(codebuildCalls, 'updateProject').returns(Promise.resolve);
            let putParameterStub = sandbox.stub(ssmCalls, 'putParameter').returns(Promise.resolve({}));

            return npm.deployPhase(phaseContext, {})
                .then(() => {
                    expect(createRoleStub.callCount).to.equal(1);
                    expect(createPolicyStub.callCount).to.equal(1);
                    expect(attachPolicyStub.callCount).to.equal(1);
                    expect(getRoleStub.callCount).to.equal(1);
                    expect(getProjectStub.callCount).to.equal(1);
                    expect(updateProjectStub.callCount).to.equal(1);
                    expect(putParameterStub.callCount).to.equal(1);
                });
        })
    });

    describe('deletePhase', function () {
        it('should delete the codebuild project', function () {
            let phaseContext = {
                phaseName: 'FakePhase',
                appName: 'FakeApp',
                params: {
                    environments_to_deploy: ['dev']
                }
            }

            let deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').returns(Promise.resolve(true))
            let deletePrarameterStub = sandbox.stub(ssmCalls, 'deleteParameter').returns(Promise.resolve(true))

            return npm.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.be.true;
                    expect(deleteProjectStub.callCount).to.equal(1);
                    expect(deletePrarameterStub.callCount).to.equal(1);
                });
        });
    });
});