const AWS = require('aws-sdk');

exports.createRole = function(roleName, trustedService) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    let assumeRolePolicyDoc = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": trustedService
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    var createParams = {
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDoc), 
        Path: "/handel-codepipeline/",
        RoleName: roleName
    };
    return iam.createRole(createParams).promise()
        .then(createResponse => {
            return createResponse.Role;
        });
}

exports.getRole = function(roleName) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    var getParams = {
        RoleName: roleName
    };
    return iam.getRole(getParams).promise()
        .then(role => {
            return role.Role;
        })
        .catch(err => {
            if(err.code === 'NoSuchEntity') {
                return null
            }
            throw err;
        });
}

exports.createRoleIfNotExists = function(roleName, trustedService) {
    return exports.getRole(roleName)
        .then(role => {
            if(!role) {
                return exports.createRole(roleName, trustedService);
            }
            else {
                return role;
            }
        });
}

exports.attachPolicyToRole = function(policyArn, roleName) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    var params = {
        PolicyArn: policyArn,
        RoleName: roleName
    };
    return iam.attachRolePolicy(params).promise()
        .then(attachResponse => {
            return attachResponse;
        });
}

exports.getPolicy = function(policyArn) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    var params = {
        PolicyArn: policyArn
    };
    return iam.getPolicy(params).promise()
        .then(policy => {
            return policy.Policy;
        })
        .catch(err => {
            if(err.code === 'NoSuchEntity') {
                return null;
            }
            throw err;
        });
}

exports.createPolicy = function(policyName, policyDocument) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    var createParams = {
        PolicyDocument: JSON.stringify(policyDocument),
        PolicyName: policyName,
        Description: `Policy for Handel-CodePipeline with name ${policyName}`,
        Path: '/handel-codepipeline/'
    };
    return iam.createPolicy(createParams).promise()
        .then(createResponse => {
            return createResponse.Policy;
        });
}

exports.createPolicyIfNotExists = function(policyName, policyArn, policyDocument) {
    return exports.getPolicy(policyArn)
        .then(policy => {
            if(!policy) { //Create
                return exports.createPolicy(policyName, policyDocument);
            }
            return policy;
        });
}