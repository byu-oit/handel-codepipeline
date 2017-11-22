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
const AWS = require('aws-sdk');

exports.createRole = function(roleName, trustedServices) {
    const iam = new AWS.IAM({apiVersion: '2010-05-08'});
    let assumeRolePolicyDoc = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": trustedServices
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
                return null;
            }
            throw err;
        });
}

exports.createRoleIfNotExists = function(roleName, trustedServices) {
    return exports.getRole(roleName)
        .then(role => {
            if(!role) {
                return exports.createRole(roleName, trustedServices);
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

/**
 * This method is used to determine the account id
 */
exports.showAccount = function () {
    const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
    let parmLstRoles = { MaxItems: 1 };
    return iam.listRoles(parmLstRoles).promise()
        .then(rsp => {
            if (!rsp || !rsp.Roles || rsp.Roles.length < 1 || !rsp.Roles[0].Arn || rsp.Roles[0].Arn.indexOf('arn:aws:iam::') != 0) { return null };
            let acctId = rsp.Roles[0].Arn.split(':')[4];
            return parseInt(acctId, 10);
        })
        .catch(err => {
            if(err.code === 'ExpiredToken') {
                return null;
            }
            else {
                throw err;
            }
        })
}
