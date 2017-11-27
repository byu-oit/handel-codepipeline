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
import * as chai from 'chai';
import deepEqual = require('deep-equal');
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as codebuildCalls from '../../../src/aws/codebuild-calls';
import * as iamCalls from '../../../src/aws/iam-calls';
import * as handel from '../../../src/common/handel';
import * as util from '../../../src/common/util';
import { PhaseContext } from '../../../src/datatypes/index';
import * as codebuild from '../../../src/phases/codebuild';
import { HandelExtraResources } from '../../../src/phases/codebuild';

chai.use(sinonChai);
const expect = chai.expect;

describe('codebuild phase module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;
    let phaseConfig: codebuild.CodeBuildConfig;
    let phaseContext: PhaseContext<codebuild.CodeBuildConfig>;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'codebuild',
            name: 'SomeFunction',
            build_image: 'MyImage'
        };

        phaseContext = new PhaseContext<codebuild.CodeBuildConfig>(
            'myapp',
            'myphase',
            'codebuild',
            'SomeBucket',
            'dev',
            accountConfig,
            phaseConfig,
            {}
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('check', () => {
        it('should require the build_image parameter', () => {
            delete phaseConfig.build_image;
            const errors = codebuild.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'build_image' parameter is required`);
        });

        it('should work when all required parameters are provided', () => {
            const errors = codebuild.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should return an empty object', async () => {
            const results = await codebuild.getSecretsForPhase(phaseConfig);
            expect(results).to.deep.equal({});
        });
    });

    describe('deployPhase', () => {
        const role = {
            Arn: 'FakeArn'
        };

        it('should create the codebuild project and return the phase config', async () => {
            const createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').resolves(role);
            const createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').resolves(role);
            const attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').resolves({});
            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(role);
            const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves(null);
            const createProjectStub = sandbox.stub(codebuildCalls, 'createProject').resolves({});

            const phase = await codebuild.deployPhase(phaseContext, accountConfig);
            expect(createRoleStub.callCount).to.equal(1);
            expect(createPolicyStub.callCount).to.equal(1);
            expect(attachPolicyStub.callCount).to.equal(1);
            expect(getRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(createProjectStub.callCount).to.equal(1);
        });

        it('should update the codebuild project when it exists', async () => {
            const createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').resolves(role);
            const createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').resolves(role);
            const attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').resolves({});
            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(role);
            const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves({});
            const updateProjectStub = sandbox.stub(codebuildCalls, 'updateProject').resolves({});

            const phase = await codebuild.deployPhase(phaseContext, accountConfig);
            expect(createRoleStub.callCount).to.equal(1);
            expect(createPolicyStub.callCount).to.equal(1);
            expect(attachPolicyStub.callCount).to.equal(1);
            expect(getRoleStub.callCount).to.equal(1);
            expect(getProjectStub.callCount).to.equal(1);
            expect(updateProjectStub.callCount).to.equal(1);
        });
    });

    describe('deletePhase', () => {
        it('should delete the codebuild project', async () => {
            const deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').resolves(true);
            const deleteRoleStub = sandbox.stub(iamCalls, 'deleteRole').resolves(true);
            const deletePolicyStub = sandbox.stub(iamCalls, 'deletePolicy').resolves(true);
            const detachPolicyStub = sandbox.stub(iamCalls, 'detachPolicyFromRole').resolves(true);

            const result = await codebuild.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
            expect(deleteRoleStub.callCount).to.equal(1);
            expect(deletePolicyStub.callCount).to.equal(1);
            expect(detachPolicyStub.callCount).to.equal(1);
            expect(deleteProjectStub.callCount).to.equal(1);
        });
    });

    describe('extra_resources', () => {
        let resourcesConfig: HandelExtraResources;
        let handelStub: any;

        const role = {
            Arn: 'FakeArn'
        };

        beforeEach(() => {
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
                type: 'codebuild',
                name: 'Build',
                build_image: 'FakeImage',
                extra_resources: resourcesConfig
            };
            phaseContext = {
                appName: 'myApp',
                pipelineName: 'pipeline',
                phaseName: 'phase',
                phaseType: 'codebuild',
                codePipelineBucketName: 'mybucket',
                accountConfig: accountConfig,
                params: phaseConfig,
                secrets: {}
            };
        });

        describe('check', () => {

            it('should check extra resource config', () => {
                handelStub.check.returns(['test error']);

                const errors = codebuild.check(phaseConfig);

                expect(errors).to.eql(['CodeBuild - extra_resources - test error']);
            });

            it('should work when all required parameters are provided', () => {
                handelStub.check.returns([]);

                const errors = codebuild.check(phaseConfig);
                expect(errors.length).to.equal(0);
            });
        });

        describe('deployPhase', () => {
            it('should create the extras and expose them to the codebuild project', async () => {

                const testPolicy = {
                    // Man, I wish these policies were this simple.
                    s3: 'read-write'
                };

                const createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').resolves(role);
                const createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').resolves(role);
                const attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').resolves({});
                const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(role);
                const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves(null);
                const createProjectStub = sandbox.stub(codebuildCalls, 'createProject').resolves({});

                const envVars = {
                    'FOO': 'bar'
                };

                handelStub.deploy.resolves({
                    policies: [testPolicy],
                    environmentVariables: envVars
                });

                const phase = await codebuild.deployPhase(phaseContext, accountConfig);
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
                    sinon.match((policy) => {
                        return policyHasStatements(policy, [testPolicy]);
                    }, 'S3 Policies')
                );
            });

            it('should accept a custom build role', async () => {
                phaseConfig.build_role = 'custom-build-role';

                const testPolicy = {
                    // Man, I wish these policies were this simple.
                    s3: 'read-write'
                };

                const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(role);
                const getProjectStub = sandbox.stub(codebuildCalls, 'getProject').resolves(null);
                const createProjectStub = sandbox.stub(codebuildCalls, 'createProject').resolves({});

                const envVars = {
                    'FOO': 'bar'
                };

                handelStub.deploy.resolves({
                    policies: [testPolicy],
                    environmentVariables: envVars
                });

                const phase = await codebuild.deployPhase(phaseContext, accountConfig);
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
            });
        });

        describe('deletePhase', () => {
            it('should delete the extra resources', async () => {
                const deleteProjectStub = sandbox.stub(codebuildCalls, 'deleteProject').resolves(true);
                const deleteRoleStub = sandbox.stub(iamCalls, 'deleteRole').resolves(true);
                const deletePolicyStub = sandbox.stub(iamCalls, 'deletePolicy').resolves(true);
                const detachPolicyStub = sandbox.stub(iamCalls, 'detachPolicyFromRole').resolves(true);
                handelStub.delete.resolves(true);

                const result = await codebuild.deletePhase(phaseContext, accountConfig);
                expect(result).to.equal(true);
                expect(deleteProjectStub.callCount).to.equal(1);
                expect(deleteRoleStub.callCount).to.equal(1);
                expect(deletePolicyStub.callCount).to.equal(1);
                expect(detachPolicyStub.callCount).to.equal(1);
                expect(handelStub.delete.callCount).to.equal(1);
            });
        });
    });
});

function policyHasStatements(policy: any, statements: any) {
    for (const statement of statements) {
        const result = policy.Statement.some((actual: any) => {
            return deepEqual(actual, statement);
        });
        if (!result) {
            return false;
        }
    }
    return true;
}
