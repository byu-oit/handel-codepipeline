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

exports.putParameter = function (name, type, value, description) {
    const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
    let param = {
        Name: name,
        Type: type,
        Value: value,
        Description: description
    }

    return ssm.putParameter(param).promise();
}

exports.deleteParameter = function (name) {
    const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
    let param = { Name: name };

    return ssm.deleteParameter(param).promise();
}

exports.deleteParameters = function (names) {
    const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
    let params = { Names: names };

    return ssm.deleteParameters(params).promise();
}