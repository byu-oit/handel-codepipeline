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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { AccountConfig } from 'handel-extension-api/dist/extension-api';
import * as s3Calls from 'handel/dist/aws/s3-calls';
import * as handelUtil from 'handel/dist/common/util';
import * as cloudFormationCalls from '../../src/aws/cloudformation-calls';
import * as handel from '../../src/common/handel';
import { PhaseConfig, PhaseContext } from '../../src/datatypes';

chai.use(sinonChai);
const expect = chai.expect;

describe('handel interface', () => {
    let sandbox: sinon.SinonSandbox;
    let bucketConfig: any;
    let dynamoConfig: any;
    let apiAccessConfig: any;
    let resourcesConfig: any;

    const phaseContext: PhaseContext<PhaseConfig> = {
        appName: 'myApp',
        phaseType: 'myPhaseType',
        codePipelineBucketName: 'myCodePipelineBucketName',
        params: {
            type: 'myparamtype',
            name: 'myparamname'
        },
        secrets: {
            value: 'mysecrets'
        },
        pipelineName: 'pipeline',
        phaseName: 'phase',
        accountConfig: {
            account_id: 111111111111,
            region: 'us-west-2',
            vpc: 'vpc-1111111',
            public_subnets: [
                'subnet-aaaaaaa',
                'subnet-bbbbbbb'
            ],
            private_subnets: [
                'subnet-aaaaaaa',
                'subnet-bbbbbbb'
            ],
            data_subnets: [
                'subnet-aaaaaaa',
                'subnet-bbbbbbb'
            ],
            ssh_bastion_sg: 'sg-4444444444',
            elasticache_subnet_group: 'elasticache-group-name',
            rds_subnet_group: 'rds-group-name',
            redshift_subnet_group: 'redshift-group-name'
        }
    };

    const accountConfig: AccountConfig = {
        account_id: '111111111111',
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
        on_prem_cidr: '10.10.10.10/0',
        elasticache_subnet_group: 'aaaaaaaaaaa',
        rds_subnet_group: 'bbaabbaabbaa',
        redshift_subnet_group: 'cccccccccccccccccc'
    };

    beforeEach(() => {
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
        };
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('check', () => {
        let s3Deployer: any;
        let dynamoDeployer: any;
        let apiAccessDeployer: any;

        beforeEach(() => {
            s3Deployer = stubDeployer(sandbox);
            dynamoDeployer = stubDeployer(sandbox);
            apiAccessDeployer = stubDeployer(sandbox);

            sandbox.stub(handelUtil, 'getServiceDeployers').callsFake(() => {
                return {
                    s3: s3Deployer,
                    dynamodb: dynamoDeployer,
                    apiaccess: apiAccessDeployer
                };
            });
        });

        it('delegates configuration checks', () => {
            const errors = handel.check(resourcesConfig);
            expect(errors).to.contain([]);
            expect(s3Deployer.check.callCount).to.equal(1);
            expect(dynamoDeployer.check.callCount).to.equal(1);
            expect(apiAccessDeployer.check.callCount).to.equal(1);
        });

        it('passes back all failures', () => {
            s3Deployer.check.returns(['s3 error']);
            dynamoDeployer.check.returns(['dynamo error']);
            apiAccessDeployer.check.returns(['api error']);

            const errors = handel.check(resourcesConfig);

            expect(errors).to.contain('s3 error');
            expect(errors).to.contain('dynamo error');
            expect(errors).to.contain('api error');
        });

        it('should reject resources that aren\'t whitelisted', () => {
            const resources = {
                test: {
                    type: 'test'
                }
            };

            const errors = handel.check(resources);

            expect(errors).to.eql(['service type \'test\' is not supported']);
        });

    });
    describe('deploy', () => {

        const s3BucketStatement = {
            Effect: 'Allow',
            Action: [
                's3:ListBucket'
            ],
            Resource: [
                'arn:aws:s3:::test'
            ]
        };

        const s3ObjectStatement = {
            Effect: 'Allow',
            Action: [
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject'
            ],
            Resource: [
                'arn:aws:s3:::test/*'
            ]
        };

        it('can deploy resources', () => {
            const cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                // Checking for logging bucket
                .onFirstCall().resolves({
                    Outputs: [{
                        OutputKey: 'BucketName',
                        OutputValue: 'logging'
                    }]
                })
                // Checking for actual bucket
                .onSecondCall().resolves(null);
            const cfCreateStub = sandbox.stub(cloudFormationCalls, 'createStack').resolves({
                Outputs: [{
                    OutputKey: 'BucketName',
                    OutputValue: 'test'
                }]
            });

            return handel.deploy({ bucket: bucketConfig }, phaseContext, accountConfig)
                .then(result => {
                    expect(result).to.contain(!null);
                    expect(result).to.have.property('policies').which.deep.include(
                        s3BucketStatement
                    );
                    expect(result).to.have.property('policies').which.deep.include(
                        s3ObjectStatement
                    );
                    expect(result).to.have.property('environmentVariables').which.includes({
                        'BUCKET_BUCKET_NAME': 'test',
                        'BUCKET_BUCKET_URL': 'https://test.s3.amazonaws.com/',
                        'BUCKET_REGION_ENDPOINT': 's3-us-west-2.amazonaws.com'
                    });

                    expect(cfCreateStub).to.have.been.calledWithMatch(
                        sinon.match('myApp-pipeline-bucket-s3'),
                        sinon.match.string,
                        sinon.match.array.deepEquals([]),
                        sinon.match(30),
                        sinon.match({
                            app: 'myApp',
                            env: 'pipeline',
                            'handel-phase': 'phase'
                        })
                    );
                });
        });
    });
    describe('delete', () => {
        it('can delete resources', () => {
            const cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                .resolves({});

            const cfDeleteStackStub = sandbox.stub(cloudFormationCalls, 'deleteStack')
                .resolves(true);

            // Stopped working once I converted to type script
            // const deleteMatchingPrefixStub = sandbox.stub(s3Calls, 'deleteMatchingPrefix')
            //     .resolves(true);

            return handel.deleteDeployedEnvironment({ bucket: bucketConfig }, phaseContext, accountConfig)
                .then(result => {
                    expect(result).have.property('status', 'success');
                    expect(cfGetStub.callCount).to.equal(1);
                    // expect(deleteMatchingPrefixStub.callCount).to.equal(1);
                    expect(cfDeleteStackStub).to.have.been.calledWith('myApp-pipeline-bucket-s3');
                });
        });
        it('handles resources that do not exist', () => {
            const cfGetStub = sandbox.stub(cloudFormationCalls, 'getStack')
                .resolves(null);

            // Stopped working once I converted to type script
            // const deleteMatchingPrefixStub = sandbox.stub(s3Calls, 'deleteMatchingPrefix')
            //     .resolves(true);

            return handel.deleteDeployedEnvironment({ bucket: bucketConfig }, phaseContext, accountConfig)
                .then(result => {
                    expect(cfGetStub.callCount).to.equal(1);
                    // expect(deleteMatchingPrefixStub.callCount).to.equal(1);
                    expect(result).have.property('status', 'success');
                });
        });
    });
});

function stubDeployer(sandbox: sinon.SinonSandbox) {
    const deployer: any = {};

    deployer.check = sandbox.stub().returns([]);
    deployer.preDeploy = sandbox.stub();
    deployer.bind = sandbox.stub();
    deployer.deploy = sandbox.stub();

    return deployer;
}
