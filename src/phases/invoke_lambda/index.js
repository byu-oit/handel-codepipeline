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
const winston = require('winston');

function getRunscopePhaseSpec(phaseContext) {
    let phaseConfig = {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Invoke",
                    owner: "AWS",
                    version: "1",
                    provider: "Lambda"
                },
                configuration: {
                    FunctionName: phaseContext.params.function_name
                },
                runOrder: 1
            }
        ]
    }

    if(phaseContext.params.function_parameters) {
        phaseConfig.actions[0].configuration.UserParameters = JSON.stringify(phaseContext.params.function_parameters)
    }

    return phaseConfig;
}

exports.check = function (phaseConfig) {
    let errors = [];
    
    if(!phaseConfig.function_name) {
        errors.push(`Invoke Lambda - The 'function_name' parameter is required`);
    }

    return errors;
}

exports.getSecretsForPhase = function (phaseConfig) {
    return Promise.resolve({});
}

exports.deployPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating Invoke Lambda phase '${phaseContext.phaseName}'`);

    return new Promise((resolve, reject) => {
        resolve(getRunscopePhaseSpec(phaseContext));
    });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    winston.info(`Nothing to delete for Invoke Lambda phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}

