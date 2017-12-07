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
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const cloudFormationCalls = require('handel/dist/aws/cloudformation-calls'); // TODO - Change to src/ when ported to TS
const s3Calls = require('handel/dist/aws/s3-calls'); // TODO - Change to src/ when ported to TS
const handelUtil = require('handel/dist/common/util'); // TODO - Change to src/ when ported to TS

const handel = require('../../dist/common/handel');

chai.use(sinonChai);
const expect = chai.expect;

describe('handel interface', function () {
    let sandbox;
    let bucketConfig;
    let dynamoConfig;
    let apiAccessConfig;
    let resourcesConfig;

    let phaseContext = {
        appName: 'myApp',
        pipelineName: 'pipeline',
        phaseName: 'phase',
        accountConfig: {
            account_id: 111111111111
        }
    };

    let accountConfig = {
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
    };


    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        bucketConfig = {
            type: 's3'
        };
        dynamoConfig = {
            type: 'dynamodb',
            partition_key: {
                name: 'key',
                type: 'String'
            }
        };
        apiAccessConfig = {
            type: 'apiaccess',
            aws_services: [
                'organizations'
            ]
        };
        resourcesConfig = {
            bucket: bucketConfig,
            ddb: dynamoConfig,
            api: apiAccessConfig
        }
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        let s3Deployer;
        let dynamoDeployer;
        let apiAccessDeployer;

        beforeEach(function () {
            s3Deployer = stubDeployer(sandbox);
            dynamoDeployer = stubDeployer(sandbox);
            apiAccessDeployer = stubDeployer(sandbox);

            sandbox.stub(handelUtil, 'getServiceDeployers').callsFake(function () {
                return {
                    s3: s3Deployer,
                    dynamodb: dynamoDeployer,
                    apiaccess: apiAccessDeployer
                };
            });
        });

        it('delegates configuration checks', function () {
            let errors = handel.check(resourcesConfig);
            expect(errors).to.be.empty;
            expect(s3Deployer.check).to.have.been.calledOnce;
            expect(dynamoDeployer.check).to.have.been.calledOnce;
            expect(apiAccessDeployer.check).to.have.been.calledOnce;
        });

        it('passes back all failures', function () {
            s3Deployer.check.returns(['s3 error']);
            dynamoDeployer.check.returns(['dynamo error']);
            apiAccessDeployer.check.returns(['api error']);

            let errors = handel.check(resourcesConfig);

            expect(errors).to.contain(
                's3 error',
                'dynamo error',
                'api error'
            );
        });
        it('should reject resources that aren\'t whitelisted', function () {
            let resources = {
                test: {
                    type: 'test'
                }
            };

            let errors = handel.check(resources);

            expect(errors).to.eql(['service type \'test\' is not supported']);
        });

    });
    describe('deploy', function () {

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

        it('can deploy resources', function () {
            let preDeployStub 
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

            return handel.deploy({bucket: bucketConfig}, phaseContext, accountConfig)
                .then(result => {
                    expect(result).to.not.be.null;
                    expect(result).to.have.property('policies').which.deep.includes(
                        s3BucketStatement, s3ObjectStatement
                    );
                    expect(result).to.have.property('environmentVariables').which.deep.equals({
                        "BUCKET_BUCKET_NAME": 'test',
                        "BUCKET_BUCKET_URL": 'https://test.s3.amazonaws.com/',
                        "BUCKET_REGION_ENDPOINT": 's3-us-west-2.amazonaws.com'
                    });

                    expect(cfCreateStub).to.have.been.calledWithMatch(
                        sinon.match('myApp-pipeline-bucket-s3'),
                        sinon.match.string,
                        sinon.match.array.deepEquals([]),
                        sinon.match({
                            app: 'myApp',
                            env: 'pipeline',
                            'handel-phase': 'phase'
                        })
                    );
                });
        });
    });
    describe('delete', function () {
        it('can delete resources', function () {
            let cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                .resolves({});

            let cfDeleteStackStub = sandbox.stub(cloudFormationCalls, 'deleteStack')
                .resolves(true);
            
            let deleteMatchingPrefixStub = sandbox.stub(s3Calls, 'deleteMatchingPrefix')
                .resolves(true);

            return handel.delete({bucket: bucketConfig}, phaseContext, accountConfig)
                .then(result => {
                    expect(result).have.property('status', 'success');
                    expect(cfGetStub.callCount).to.equal(1);
                    expect(deleteMatchingPrefixStub.callCount).to.equal(1);
                    expect(cfDeleteStackStub).to.have.been.calledWith('myApp-pipeline-bucket-s3');
                });
        });
        it('handles resources that do not exist', function () {
            let cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                .resolves(null);

            let deleteMatchingPrefixStub = sandbox.stub(s3Calls, 'deleteMatchingPrefix')
                .resolves(true);

            return handel.delete({bucket: bucketConfig}, phaseContext, accountConfig)
                .then(result => {
                    expect(cfGetStub.callCount).to.equal(1);
                    expect(deleteMatchingPrefixStub.callCount).to.equal(1);
                    expect(result).have.property('status', 'success');
                });
        });
    });
});

function stubDeployer(sandbox) {
    let deployer = {};

    deployer.check = sandbox.stub().returns([]);
    deployer.preDeploy = sandbox.stub();
    deployer.bind = sandbox.stub();
    deployer.deploy = sandbox.stub();

    return deployer;
}

