const fs = require('fs');
const AWS = require('aws-sdk');
const cloudFormation = new AWS.CloudFormation({apiVersion: '2010-05-15'});

function getCloudFormationParameter(key, value) {
    return {
        ParameterKey: key,
        ParameterValue: value,
        UsePreviousValue: false
    }
}

function createHandelWorkerIfNotExists(accountConfig) {
    let stackName = 'handel-codepipeline-worker';
    let workerImageName = `${accountConfig.account_id}.dkr.ecr.${accountConfig.region}.amazonaws.com/handel-codepipeline-worker:latest`;

    const describeParams = {
        StackName: stackName
    };

    return cloudFormation.describeStacks(describeParams).promise()
        .then(describeResult => {
            console.log("Handel worker already exists");
            let stack = describeResult.Stacks[0];
            return stack;
        })
        .catch(err => {
            if(err.code !== "ValidationError") { //Other error
                throw err;
            }

            //Stack doesnt exist, so create it
            console.log("Creating Handel worker in account");

            let stackParameters = [
                getCloudFormationParameter("NumInstances", "1"),
                getCloudFormationParameter("InstanceType", "t2.micro"),
                getCloudFormationParameter("KeyName", "aws-credential-detector"), //TODO - Change this later
                getCloudFormationParameter("AmiImageId", "ami-f173cc91"),
                getCloudFormationParameter("PrivateSubnets", accountConfig.private_subnets.join(",")),
                getCloudFormationParameter("PublicSubnets", accountConfig.public_subnets.join(",")),
                getCloudFormationParameter("VpcId", accountConfig.vpc),
                getCloudFormationParameter("DataSubnets", accountConfig.data_subnets.join(",")),
                getCloudFormationParameter("CidrIngress", accountConfig.on_prem_cidr),
                getCloudFormationParameter("WorkerImage", workerImageName),
                getCloudFormationParameter("SshBastionSg", accountConfig.ssh_bastion_sg)
            ]
            let templateBody = fs.readFileSync(`${__dirname}/../create-pipeline/templates/handel-worker.yml`, 'utf8');

            let createParams = {
                StackName: stackName,
                OnFailure: 'DELETE',
                Parameters: stackParameters,
                Capabilities: ["CAPABILITY_IAM"],
                TemplateBody: templateBody,
                TimeoutInMinutes: 30
            };


            return cloudFormation.createStack(createParams).promise()
                .then(createResult => {
                    let waitParams = {
                        StackName: stackName
                    };
                    console.log('Waiting for stack to be in stackCreateComplete state');
                    return cloudFormation.waitFor('stackCreateComplete', waitParams).promise()
                        .then(waitResponse => {
                            console.log("Created Handel worker in account");
                            return waitResponse.Stacks[0];
                        });
                });
        });
}

exports.createHandelWorkers = function(accountConfigs) {
    let workerCreatePromises = [];

    let returnStacks = {};

    for(let accountId in accountConfigs) {
        let accountConfig = accountConfigs[accountId];
        let workerCreatePromise = createHandelWorkerIfNotExists(accountConfig)
            .then(stack => {
                returnStacks[accountId] = stack;
                return stack;
            });
        workerCreatePromises.push(workerCreatePromise);
    }

    return Promise.all(workerCreatePromises)
        .then(createResults => {
            return returnStacks; //This was built-up dynamically above
        });
}