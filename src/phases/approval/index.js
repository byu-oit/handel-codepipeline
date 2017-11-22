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

function getApprovalPhaseSpec(phaseContext) {
    return {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                outputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Approval",
                    owner: "AWS",
                    version: "1",
                    provider: "Manual"
                },
                configuration: {},
                runOrder: 1
            }
        ]
    }
}

exports.check = function(phaseConfig) {
    let errors = [];
    
    //No required parameters

    return errors;
}

exports.getSecretsForPhase = function (phaseConfig) {
    return Promise.resolve({});
}

exports.deployPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating manual approval phase '${phaseContext.phaseName}'`);

    return Promise.resolve(getApprovalPhaseSpec(phaseContext))
}

exports.deletePhase = function(phaseContext, accountConfig) {
    winston.info(`Nothing to delete for source phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}