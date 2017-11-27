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
import * as AWS from 'aws-sdk';
import * as winston from 'winston';
import awsWrapper from './aws-wrapper';

export async function createRole(roleName: string, trustedServices: string[]) {
    const assumeRolePolicyDoc = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Principal': {
                    'Service': trustedServices
                },
                'Action': 'sts:AssumeRole'
            }
        ]
    };
    const createParams = {
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDoc),
        Path: '/handel-codepipeline/',
        RoleName: roleName
    };
    const createResponse = await awsWrapper.iam.createRole(createParams);
    return createResponse.Role;
}

export async function getRole(roleName: string) {
    const getParams = {
        RoleName: roleName
    };
    try {
        const response = await awsWrapper.iam.getRole(getParams);
        return response.Role;
    }
    catch (err) {
        if (err.code === 'NoSuchEntity') {
            return null;
        }
        throw err;
    }
}

export async function createRoleIfNotExists(roleName: string, trustedServices: string[]) {
    const role = await exports.getRole(roleName);
    if (!role) {
        return exports.createRole(roleName, trustedServices);
    }
    else {
        return role;
    }
}

export async function attachPolicyToRole(policyArn: string, roleName: string) {
    const params = {
        PolicyArn: policyArn,
        RoleName: roleName
    };
    const attachResponse = await awsWrapper.iam.attachRolePolicy(params);
    return attachResponse;
}

export async function getPolicy(policyArn: string) {
    const params = {
        PolicyArn: policyArn
    };
    try {
        const response = await awsWrapper.iam.getPolicy(params);
        return response.Policy;
    }
    catch (err) {
        if (err.code === 'NoSuchEntity') {
            return null;
        }
        throw err;
    }
}

export async function createPolicy(policyName: string, policyDocument: any) { // TODO - What type should be used for policyDocument?
    const createParams = {
        PolicyDocument: JSON.stringify(policyDocument),
        PolicyName: policyName,
        Description: `Policy for Handel-CodePipeline with name ${policyName}`,
        Path: '/handel-codepipeline/'
    };
    const createResponse = await awsWrapper.iam.createPolicy(createParams);
    return createResponse.Policy;
}

export async function createPolicyIfNotExists(policyName: string, policyArn: string, policyDocument: any) { // TODO - What type should be used for policyDocument?
    const policy = await exports.getPolicy(policyArn);
    if (!policy) { // Create
        return exports.createPolicy(policyName, policyDocument);
    }
    return policy;
}

/**
 * This method is used to determine the account id
 */
export async function showAccount() {
    const listRolesParams = {
        MaxItems: 1
    };
    try {
        const response: any = await awsWrapper.iam.listRoles(listRolesParams);
        if (!response || !response.Roles || response.Roles.length < 1 || !response.Roles[0].Arn || response.Roles[0].Arn.indexOf('arn:aws:iam::') !== 0) {
            return null;
        }
        const accountId = response.Roles[0].Arn.split(':')[4];
        return parseInt(accountId, 10);
    }
    catch (err) {
        if (err.code === 'ExpiredToken') {
            return null;
        }
        else {
            throw err;
        }
    }
}

export async function deleteRole(roleName: string): Promise<boolean> {
    winston.debug(`Deleting role ${roleName}`);
    const deleteRoleParams: AWS.IAM.DeleteRoleRequest = {
        RoleName: roleName
    };
    try {
        await awsWrapper.iam.deleteRole(deleteRoleParams);
        winston.debug(`Finished deleting role '${roleName}'`);
        return true;
    }
    catch (err) {
        if (err.code === 'NoSuchEntity') {
            winston.debug(`Role '${roleName}' was already deleted`);
            return true;
        }
        else {
            winston.debug(`Error deleting role '${roleName}': ${err}`);
            return false;
        }
    }
}

export async function detachPolicyFromRole(roleName: string, policyArn: string): Promise<boolean> {
    winston.debug(`Detaching policy '${policyArn}' from role '${roleName}'`);
    const detachParams = {
        PolicyArn: policyArn,
        RoleName: roleName
    };
    try {
        await awsWrapper.iam.detachRolePolicy(detachParams);
        winston.debug(`Finished detaching policy '${policyArn}' from role '${roleName}'`);
        return true;
    }
    catch (err) {
        if (err.code === 'NoSuchEntity') {
            winston.debug(`Policy '${policyArn}' was already detached`);
            return true;
        }
        else {
            winston.debug(`Error detaching policy '${policyArn}' from role '${roleName}': ${err}`);
            return false;
        }
    }
}

export async function deletePolicy(policyArn: string): Promise<boolean> {
    winston.debug(`Deleting policy ${policyArn}`);
    const deletePolicyParams: AWS.IAM.DeletePolicyRequest = {
        PolicyArn: policyArn
    };
    try {
        await awsWrapper.iam.deletePolicy(deletePolicyParams);
        winston.debug(`Finished deleting policy '${policyArn}'`);
        return true;
    }
    catch (err) {
        if (err.code === 'NoSuchEntity') {
            winston.debug(`Policy '${policyArn}' was already deleted`);
            return true;
        }
        else {
            winston.debug(`Error deleting policy '${policyArn}': ${err}`);
            return false;
        }
    }
}
