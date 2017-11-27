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
import awsWrapper from './aws-wrapper';

export function putParameter(name: string, type: string, value: string, description: string): Promise<AWS.SSM.PutParameterResult> {
    const param = {
        Name: name,
        Type: type,
        Value: value,
        Description: description
    };
    return awsWrapper.ssm.putParameter(param);
}

export function deleteParameter(name: string): Promise<AWS.SSM.DeleteParameterResult> {
    const param = { Name: name };
    return awsWrapper.ssm.deleteParameter(param);
}

export function deleteParameters(names: string[]): Promise<AWS.SSM.DeleteParametersResult> {
    const params = { Names: names };
    return awsWrapper.ssm.deleteParameters(params);
}
