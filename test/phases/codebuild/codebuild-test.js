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

const handelAccountConfig = require('handel/lib/common/account-config');
const cloudFormationCalls = require('handel/lib/aws/cloudformation-calls');

const AWS = require('aws-sdk-mock');

const PreDeployContext = require('handel/lib/datatypes/pre-deploy-context');
const BindContext = require('handel/lib/datatypes/bind-context');
const DeployContext = require('handel/lib/datatypes/deploy-context');

const handelUtil = require('handel/lib/common/util');

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
        AWS.restore();
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

    describe('createPhase', function () {
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

            return codebuild.createPhase(phaseContext, {})
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

            return codebuild.createPhase(phaseContext, {})
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
        let phaseContext;

        let role = {
            Arn: "FakeArn"
        }

        let phaseConfig;

        beforeEach(function () {
            phaseConfig = {
                build_image: 'FakeImage',
                extra_resources: {
                    test_bucket: {
                        type: 's3'
                    }
                }
            };
            phaseContext = {
                appName: 'myApp',
                pipelineName: 'pipeline',
                phaseName: 'phase',
                accountConfig: {
                    account_id: 111111111111
                },
                params: phaseConfig
            }
        });

        describe('check', function () {
            let testDeployer;

            beforeEach(function () {
                testDeployer = {};

                testDeployer.check = sandbox.stub().returns([]);
                testDeployer.preDeploy = sandbox.stub();
                testDeployer.bind = sandbox.stub();
                testDeployer.deploy = sandbox.stub();

                sandbox.stub(handelUtil, 'getServiceDeployers').callsFake(function () {
                    return {
                        s3: testDeployer
                    };
                });
            });


            it('should check extra resource config', function () {
                testDeployer.check.returns(['test error']);

                let errors = codebuild.check(phaseConfig);

                expect(errors).to.eql(['CodeBuild - extra_resources - test error']);
            });

            it('should reject resources that aren\'t whitelisted', function () {
                phaseConfig = {
                    build_image: 'FakeImage',
                    extra_resources: {
                        test_bucket: {
                            type: 'test'
                        }
                    }
                };

                let errors = codebuild.check(phaseConfig);

                expect(errors).to.eql(['CodeBuild - extra_resources - service type \'test\' is not supported']);
            });

            it('should work when all required parameters are provided', function () {
                let errors = codebuild.check(phaseConfig);
                expect(errors).to.be.empty;
            });
        });

        describe('createPhase', function () {

            let context = {
                appName: 'test',
                environmentName: 'env',
                pipelineName: 'pipeline',
                phaseName: 'phase',
                serviceName: 'test-bucket',
                serviceType: 's3'
            };

            it('should create the extras and expose them to the codebuild project', function () {
                handelAccountConfig({
                    account_id: 111111111111,
                    region: 'us-west-2',
                    vpc: 'vpc-aaaaaaaa',
                    public_subnets: [
                        'subnet-ffffffff',
                        'subnet-44444444'
                    ],
                    private_subnets: [
                        'subnet-00000000',
                        'subnet-77777777'
                    ],
                    data_subnets: [
                        'subnet-eeeeeeee',
                        'subnet-99999999'
                    ],
                    ecs_ami: 'ami-66666666',
                    ssh_bastion_sg: 'sg-44444444',
                    on_prem_cidr: '10.10.10.10/0'
                }).getAccountConfig();

                let s3BucketStatement = {
                    Effect: 'Allow',
                    Action: [
                        "s3:ListBucket"
                    ],
                    Resource: [
                        "arn:aws:s3:::test"
                    ]
                };

                let s3ObjectStatement = {
                    Effect: 'Allow',
                    Action: [
                        "s3:PutObject",
                        "s3:GetObject",
                        "s3:DeleteObject"
                    ],
                    Resource: [
                        "arn:aws:s3:::test/*"
                    ]
                };

                let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve(role));
                let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve(role));
                let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
                let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve(role));
                let getProjectStub = sandbox.stub(codebuildCalls, 'getProject').returns(Promise.resolve(null));
                let createProjectStub = sandbox.stub(codebuildCalls, 'createProject').returns(Promise.resolve);

                let cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                //Checking for logging bucket
                    .onFirstCall().resolves({
                        Outputs: [{
                            OutputKey: 'BucketName',
                            OutputValue: 'logging'
                        }]
                    })
                    //Checking for actual bucket
                    .onSecondCall().resolves(null);
                let cfCreateStub = sandbox.stub(cloudFormationCalls, 'createStack').resolves({
                    Outputs: [{
                        OutputKey: 'BucketName',
                        OutputValue: 'test'
                    }]
                });

                return codebuild.createPhase(phaseContext, {})
                    .then(phase => {
                        expect(cfCreateStub).to.have.been.calledWithMatch(
                            sinon.match('myApp-pipeline-test_bucket-s3'),
                            sinon.match.string,
                            sinon.match.array.deepEquals([]),
                            sinon.match({
                                app: 'myApp',
                                env: 'pipeline',
                                'handel-phase': 'phase'
                            })
                        );
                        expect(createProjectStub).to.have.been.calledWithMatch(
                            sinon.match('myApp-pipeline-phase'),
                            sinon.match('myApp'),
                            sinon.match('FakeImage'),
                            sinon.match({
                                "S3_MYAPP_PIPELINE_TEST_BUCKET_BUCKET_NAME": 'test',
                                "S3_MYAPP_PIPELINE_TEST_BUCKET_BUCKET_URL": 'https://test.s3.amazonaws.com/',
                                "S3_MYAPP_PIPELINE_TEST_BUCKET_REGION_ENDPOINT": 's3-us-west-2.amazonaws.com',
                            }),
                            sinon.match.any,
                            sinon.match('FakeArn'),
                            sinon.match.any
                        );

                        expect(createPolicyStub).to.have.been.calledWithMatch(
                            sinon.match('myApp-HandelCodePipelineBuildPhase'),
                            sinon.match.string,
                            sinon.match(function (policy) {
                                return policyHasStatements(policy, [s3BucketStatement, s3ObjectStatement])
                            }, "S3 Policies")
                        );
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