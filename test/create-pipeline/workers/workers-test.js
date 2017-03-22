const workers = require('../../../create-pipeline/workers');
const expect = require('chai').expect;
const AWS = require('aws-sdk-mock');

describe('workers module', function() {
    describe('createHandelWorkers', function() {
        it('should create the handel worker stack if not already present', function() {
            let accountId = 555555555555;
            let accountConfigs = {};
            accountConfigs[accountId] = {
                account_id: accountId,
                region: 'us-west-2',
                private_subnets: ['subnet-fake'],
                public_subnets: ['subnet-fake2'],
                data_subnets: ['subnet-fake3'],
                vpc: 'vpc-fake',
                on_prem_cidr: '0.0.0.0/0',
                ssh_bastion_sh: 'sg-fake'
            };

            let stackName = "FakeStackName";
            AWS.mock('CloudFormation', 'describeStacks', Promise.reject({
                code: "ValidationError"
            }));
            AWS.mock('CloudFormation', 'createStack', Promise.resolve({}));
            AWS.mock('CloudFormation', 'waitFor', Promise.resolve({
                Stacks: [{
                    StackName: stackName
                }]
            }))

            return workers.createHandelWorkers(accountConfigs)
                .then(accountStacks => {
                    expect(accountStacks[accountId]).to.not.be.undefined;
                    expect(accountStacks[accountId].StackName).to.equal(stackName);
                    AWS.restore('CloudFormation');
                });
        });

        it('should just return the handel worker stack if already present', function() {
            let accountId = 555555555555;
            let accountConfigs = {};
            accountConfigs[accountId] = {
                account_id: accountId,
                region: 'us-west-2',
                private_subnets: ['subnet-fake'],
                public_subnets: ['subnet-fake2'],
                data_subnets: ['subnet-fake3'],
                vpc: 'vpc-fake',
                on_prem_cidr: '0.0.0.0/0',
                ssh_bastion_sh: 'sg-fake'
            };

            let stackName = "FakeStackName";
            AWS.mock('CloudFormation', 'describeStacks', Promise.resolve({
                Stacks: [{ 
                    StackName: stackName
                }]
            }));

            return workers.createHandelWorkers(accountConfigs)
                .then(accountStacks => {
                    expect(accountStacks[accountId]).to.not.be.undefined;
                    expect(accountStacks[accountId].StackName).to.equal(stackName);
                    AWS.restore('CloudFormation');
                });
        });
    });
});