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
import * as winston from 'winston';
import * as awsWrapper from './aws-wrapper';

/**
 * Given a stack name, returns the stack, or null if it doesnt exist
 *
 * @param {String} stackName - The name of the stack to get
 * @returns - The CloudFormation Stack, or null if it doesnt exist
 */
export async function getStack(stackName: string) {
    const params = {
        StackName: stackName
    };
    winston.debug(`Attempting to get CloudFormation stack ${stackName}`);
    try {
        const describeResult = await awsWrapper.cloudFormation.describeStacks(params);
        winston.debug(`Found CloudFormation stack ${stackName}`);
        if(describeResult.Stacks) { // Return the requested stack
            return describeResult.Stacks[0];
        }
        else { // No stack returned
            return null;
        }
    }
    catch(err) {
        if(err.code === 'ValidationError') { // Stack does not exist
            winston.debug(`CloudFormation stack ${stackName} not found`);
            return null;
        }
        throw err;
    }
}

/**
 * Waits for the given stack to be in the given state
 *
 * @param {String} stackName - The name of the stack to wait for
 * @param {String} stackState - The state to wait for
 * @returns
 */
export async function waitForStack(stackName: string, stackState: string) {
    winston.debug(`Waiting for ${stackName} to be in ${stackState}`);
    const waitParams = {
        StackName: stackName
    };
    const waitResponse = await awsWrapper.cloudFormation.waitFor(stackState, waitParams);
    winston.debug(`Stack ${stackName} is in ${stackState}`);
    if(waitResponse.Stacks) {
        return waitResponse.Stacks[0];
    }
    else {
        return null;
    }
}

export async function createStack(stackName: string, templateBody: string, parameters: any) {
    const params = {
        StackName: stackName,
        OnFailure: 'DELETE',
        Parameters: parameters,
        Capabilities: ['CAPABILITY_IAM'],
        TemplateBody: templateBody,
        TimeoutInMinutes: 30
    };
    winston.debug(`Creating CloudFormation stack ${stackName}`);
    const createResult = await awsWrapper.cloudFormation.createStack(params);
    winston.debug(`Created CloudFormation stack ${stackName}`);
    return exports.waitForStack(stackName, 'stackCreateComplete');
}

export async function deleteStack(stackName: string) {

    const deleteParams = {
        StackName: stackName
    };
    winston.debug(`Deleting CloudFormation stack ${stackName}`);
    const deleteResult = await awsWrapper.cloudFormation.deleteStack(deleteParams);
    const waitParams = {
        StackName: stackName
    };
    const waitResponse = await await awsWrapper.cloudFormation.waitFor('stackDeleteComplete', waitParams);
    return true;
}

export function getCfStyleStackParameters(parametersObj: any) {
    const stackParameters = [];

    for(const key of Object.keys(parametersObj)) {
        stackParameters.push({
            ParameterKey: key,
            ParameterValue: parametersObj[key],
            UsePreviousValue: false
        });
    }

    return stackParameters;
}

/**
 * Given a CloudFormation stack, get the output for the given key
 * Returns null if key is not found
 */
export function getOutput(outputKey: string, cfStack: any) {
    for(const output of cfStack.Outputs) {
        if(output.OutputKey === outputKey) {
            return output.OutputValue;
        }
    }
    return null;
}
