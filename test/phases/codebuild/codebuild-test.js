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
const codebuild = require('../../../lib/phases/codebuild');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const iamCalls = require('../../../lib/aws/iam-calls');
const codebuildCalls = require('../../../lib/aws/codebuild-calls');

const handel = require('../../../lib/common/handel');

const deepEqual = require('deep-equal');

chai.use(sinonChai);
const expect = chai.expect;

describe('codebuild phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the build_image parameter', function () {
            let phaseConfig = {};
            let errors = codebuild.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'build_image' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                build_image: 'FakeImage'
            };
            let errors = codebuild.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should return an empty object', function () {
            return codebuild.getSecretsForPhase()
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
            params: {}
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

            return codebuild.deployPhase(phaseContext, {})
                .then(phase => {
                    expect(createRoleStub.calledOnce).to.be.true;
                    expect(createPolicyStub.calledOnce).to.be.true;
                    expect(attachPolicyStub.calledOnce).to.be.true;
                    expect(getRoleStub.calledOnce).to.be.true;
                    expect(getProjectStub.calledOnce).to.be.true;
                    expect(createProjectStub.calledOnce).to.be.true;
                });
        });

        it('should update the codebuild project when it exists', function () {
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
            let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve({}));
            let updateProjectStub = sandbox.stub(codebuildCalls, 'updateProject').returns(Promise.resolve)

            return codebuild.deployPhase(phaseContext, {})
                .then(phase => {
                    expect(createRoleStub.calledOnce).to.be.true;
                    expect(createPolicyStub.calledOnce).to.be.true;
                    expect(attachPolicyStub.calledOnce).to.be.true;
                    expect(getRoleStub.calledOnce).to.be.true;
                    expect(getProjectStub.calledOnce).to.be.true;
                    expect(updateProjectStub.calledOnce).to.be.true;
                });
        });
    });

    describe('deletePhase', function () {
        let phaseContext = {
            phaseName: 'FakePhase',
            appName: 'FakeApp'
        }

        it('should delete the codebuild project', function () {
            let deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').returns(Promise.resolve(true))
            return codebuild.deletePhase(phaseContext, {})
                .then(result => {
                    expect(result).to.be.true;
                    expect(deleteProjectStub.calledOnce).to.be.true;
                });
        });
    });

    describe('extra_resources', function () {
        let resourcesConfig, phaseContext, phaseConfig, handelStub;

        let role = {
            Arn: "FakeArn"
        };

        beforeEach(function () {
            handelStub = {
                check: sandbox.stub(handel, 'check').returns([]),
                deploy: sandbox.stub(handel, 'deploy'),
                'delete': sandbox.stub(handel, 'delete')
            };
            resourcesConfig = {
                test_bucket: {
                    type: 's3'
                }
            };
            phaseConfig = {
                build_image: 'FakeImage',
                extra_resources: resourcesConfig
            };
            phaseContext = {
                appName: 'myApp',
                pipelineName: 'pipeline',
                phaseName: 'phase',
                accountConfig: {
                    account_id: 111111111111
                },
                params: phaseConfig
            };
        });

        describe('check', function () {

            it('should check extra resource config', function () {
                handelStub.check.returns(['test error']);

                let errors = codebuild.check(phaseConfig);

                expect(errors).to.eql(['CodeBuild - extra_resources - test error']);
            });

            it('should work when all required parameters are provided', function () {
                handelStub.check.returns([]);

                let errors = codebuild.check(phaseConfig);
                expect(errors).to.be.empty;
            });
        });

        describe('deployPhase', function () {
            it('should create the extras and expose them to the codebuild project', function () {

                let testPolicy = {
                    //Man, I wish these policies were this simple.
                    s3: 'read-write'
                };

                let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
                let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
                let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
                let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
                let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve(null));
                let createProjectStub = sandbox.stub(codebuildCalls, 'createProject').returns(Promise.resolve);

                let envVars = {
                    "FOO": 'bar'
                };

                handelStub.deploy.resolves({
                    policies: [testPolicy],
                    environmentVariables: envVars
                });

                return codebuild.deployPhase(phaseContext, {})
                    .then(phase => {
                        expect(handelStub.deploy).to.have.been.calledWithMatch(
                            sinon.match(resourcesConfig),
                            sinon.match(phaseContext),
                            sinon.match.any
                        );

                        expect(createProjectStub).to.have.been.calledWithMatch(
                            sinon.match('myApp-pipeline-phase'),
                            sinon.match('myApp'),
                            sinon.match(phaseContext.pipelineName),
                            sinon.match(phaseContext.phaseName),
                            sinon.match('FakeImage'),
                            sinon.match(envVars),
                            sinon.match.any,
                            sinon.match('FakeArn'),
                            sinon.match.any
                        );

                        expect(createPolicyStub).to.have.been.calledWithMatch(
                            sinon.match('myApp-HandelCodePipelineBuildPhase'),
                            sinon.match.string,
                            sinon.match(function (policy) {
                                return policyHasStatements(policy, [testPolicy])
                            }, "S3 Policies")
                        );
                    });
            });

        });

        describe('deletePhase', function () {
            it('should delete the extra resources', function () {
                let deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').resolves(true);

                handelStub.delete.resolves(true);

                return codebuild.deletePhase(phaseContext, {})
                    .then(result => {
                        expect(result).to.be.true;
                        expect(handelStub.delete).to.have.been.calledOnce;
                    });
            });
        });
    });
});

function policyHasStatements(policy, statements) {
    for (let statement of statements) {
        let result = policy.Statement.some(actual => {
            return deepEqual(actual, statement);
        });
        if (!result) {
            return false;
        }
    }
    return true;
}
