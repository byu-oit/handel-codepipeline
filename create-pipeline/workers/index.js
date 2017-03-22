const fs = require('fs');
const AWS = require('aws-sdk');

function getCloudFormationParameter(key, value) {
    return {
        ParameterKey: key,
        ParameterValue: value,
        UsePreviousValue: false
    }
}

function getStack(cloudFormation, stackName) {
     const describeParams = {
        StackName: stackName
    };

    return cloudFormation.describeStacks(describeParams).promise()
        .then(describeResult => {
            console.log(`Stack ${stackName} already exists`);
            let stack = describeResult.Stacks[0];
            return stack;
        })
        .catch(err => {
            if(err.code === "ValidationError") { //Other error
                console.log(`Stack ${stackName} does not exist`);
                return null;
            }
            throw err;
        });
}

function createStack(cloudFormation, stackName, stackParameters, templateBody) {
    let createParams = {
        StackName: stackName,
        OnFailure: 'DELETE',
        Parameters: stackParameters,
        Capabilities: ["CAPABILITY_IAM"],
        TemplateBody: templateBody,
        TimeoutInMinutes: 30
    };

    console.log(`Creating stack ${stackName}`);
    return cloudFormation.createStack(createParams).promise()
        .then(createResult => {
            let waitParams = {
                StackName: stackName
            };
            console.log(`Waiting for stack ${stackName} to be in stackCreateComplete state`);
            return cloudFormation.waitFor('stackCreateComplete', waitParams).promise()
                .then(waitResponse => {
                    console.log(`Created stack ${stackName}`);
                    return waitResponse.Stacks[0];
                });
        });
}

function createHandelWorkerStack(cloudFormation, stackName, accountConfig) {
    let workerImageName = `${accountConfig.account_id}.dkr.ecr.${accountConfig.region}.amazonaws.com/handel-codepipeline-worker:latest`;
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
    let templateBody = fs.readFileSync(`${__dirname}/handel-worker.yml`, 'utf8');

    return createStack(cloudFormation, stackName, stackParameters, templateBody);
}

function createHandelWorkerIfNotExists(cloudFormation, accountConfig) {
    let stackName = 'handel-codepipeline-worker';

    console.log("Creating Handel worker in account");
    return getStack(cloudFormation, stackName)
        .then(stack => {
            if(!stack) { //Create
                return createHandelWorkerStack(cloudFormation, stackName, accountConfig);
            }
            else { //Already exists
                return stack;
            }
        });
}

exports.createHandelWorkers = function(accountConfigs) {
    const cloudFormation = new AWS.CloudFormation({apiVersion: '2010-05-15'});
    let workerCreatePromises = [];

    let returnStacks = {};

    for(let accountId in accountConfigs) {
        let accountConfig = accountConfigs[accountId];
        let workerCreatePromise = createHandelWorkerIfNotExists(cloudFormation, accountConfig)
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