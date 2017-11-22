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
const codepipelineCalls = require('../aws/codepipeline-calls');
const async = require('async');

function deployPhase(phaseContext, phaseDeployers, accountConfig) {
    return new Promise((resolve, reject) => {
        let phaseDeployer = phaseDeployers[phaseContext.phaseType];
        if (!phaseDeployer) {
            return reject(new Error(`Invalid or unsupported pipeline phase type ${phaseContext.phaseType}`));
        }
        else {
            phaseDeployer.deployPhase(phaseContext, accountConfig)
                .then(phaseResult => {
                    return resolve(phaseResult);
                })
                .catch(err => {
                    return reject(err);
                });
        }
    });
}

function getPhaseContext(handelCodePipelineFile, codePipelineBucketName, pipelineName, accountConfig, phase, phaseSecrets) {
    return {
        appName: handelCodePipelineFile.name,
        codePipelineBucketName: codePipelineBucketName,
        pipelineName: pipelineName,
        accountConfig: accountConfig,
        phaseType: phase.type,
        phaseName: phase.name,
        params: phase,
        secrets: phaseSecrets
    }
}

exports.checkPhases = function (handelCodePipelineFile, phaseDeployers) {
    let pipelineErrors = {};

    for (let pipelineName in handelCodePipelineFile.pipelines) {
        pipelineErrors[pipelineName] = [];
        let pipelineConfig = handelCodePipelineFile.pipelines[pipelineName];
        for (let phaseConfig of pipelineConfig.phases) {
            let phaseType = phaseConfig.type;
            let phaseDeployer = phaseDeployers[phaseType];
            if (!phaseDeployer) {
                pipelineErrors[pipelineName] = [
                    `You specified an invalid phase type: '${phaseType}'`
                ];
            }
            else {
                let errors = phaseDeployer.check(phaseConfig)
                pipelineErrors[pipelineName] = pipelineErrors[pipelineName].concat(errors);
            }
        }
    }

    return pipelineErrors;
}

exports.validatePipelineSpec = function (handelCodePipelineFile) {
    let errors = [];

    if (!handelCodePipelineFile.name) {
        errors.push("The top-level 'name' field is required");
    }

    if (!handelCodePipelineFile.pipelines || Object.keys(handelCodePipelineFile.pipelines).length === 0) {
        errors.push("You must specify at least one or more pipelines in the 'pipelines' field");
    }
    else {
        for (let pipelineName in handelCodePipelineFile.pipelines) {
            let pipelineDef = handelCodePipelineFile.pipelines[pipelineName]
            if (!pipelineDef.phases) {
                errors.push(`You must specify at least one or more phases in your pipeline ${pipelineName}`);
            }
            else {
                //Validate first phase is github
                if (pipelineDef.phases.length < 2) {
                    errors.push(`You must specify at least two phases: github and codebuild`);
                }
                else {
                    if (pipelineDef.phases[0].type !== 'github' && pipelineDef.phases[0].type !== 'codecommit') {
                        errors.push(`The first phase in your pipeline ${pipelineName} must be a 'github' or 'codecommit' phase`)
                    }
                    if (pipelineDef.phases[1].type !== 'codebuild') {
                        errors.push(`The second phase in your application ${pipelineName} must be a codebuild phase`);
                    }
                }

                //Validate each phase has a type and name
                for (let phaseSpec of pipelineDef.phases) {
                    if (!phaseSpec.type) {
                        errors.push(`You must specify a type for all the phases in your pipeline ${pipelineName}`);
                    }
                    if (!phaseSpec.name) {
                        errors.push(`You must specify a name for all the phases in your pipeline ${pipelineName}`);
                    }
                }
            }
        }
    }

    return errors;
}

exports.getPhaseSecrets = function (phaseDeployers, handelCodePipelineFile, pipelineName) {
    return new Promise((resolve, reject) => {
        let inputFunctions = [];

        for (let phaseSpec of handelCodePipelineFile.pipelines[pipelineName].phases) {
            let phaseType = phaseSpec.type;
            let phaseDeployer = phaseDeployers[phaseType];
            inputFunctions.push(function (callback) {
                phaseDeployer.getSecretsForPhase(phaseSpec)
                    .then(phaseSecrets => {
                        callback(null, phaseSecrets);
                    })
                    .catch(err => {
                        callback(err, null);
                    });
            });
        }

        async.series(inputFunctions, function (err, results) {
            if (!err) {
                return resolve(results);
            }
            else {
                return reject(err);
            }
        });
    });
}

exports.deployPhases = function (phaseDeployers, handelCodePipelineFile, pipelineName, accountConfig, phasesSecrets, codePipelineBucketName) {
    let deployPromises = [];

    let pipelinePhases = handelCodePipelineFile.pipelines[pipelineName].phases
    for (let i = 0; i < pipelinePhases.length; i++) {
        let phase = pipelinePhases[i];

        let phaseContext = getPhaseContext(handelCodePipelineFile, codePipelineBucketName, pipelineName, accountConfig, phase, phasesSecrets[i]);

        deployPromises.push(deployPhase(phaseContext, phaseDeployers, accountConfig));
    }

    return Promise.all(deployPromises);
}

exports.deployPipeline = function (handelCodePipelineFile, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName) {
    let appName = handelCodePipelineFile.name;
    let pipelineProjectName = codepipelineCalls.getPipelineProjectName(appName, pipelineName);

    return codepipelineCalls.getPipeline(pipelineProjectName)
        .then(pipeline => {
            if (!pipeline) {
                return codepipelineCalls.createPipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
            }
            else {
                return codepipelineCalls.updatePipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
            }
        });
}

exports.deletePhases = function (phaseDeployers, handelCodePipelineFile, pipelineName, accountConfig, codePipelineBucketName) {
    let deletePromises = [];

    let pipelinePhases = handelCodePipelineFile.pipelines[pipelineName].phases
    for (let i = 0; i < pipelinePhases.length; i++) {
        let phase = pipelinePhases[i];
        let phaseType = phase.type;
        let phaseDeloyer = phaseDeployers[phaseType];

        let phaseContext = getPhaseContext(handelCodePipelineFile, codePipelineBucketName, pipelineName, accountConfig, phase, {}); //Don't need phase secrets for delete

        deletePromises.push(phaseDeloyer.deletePhase(phaseContext, accountConfig));
    }

    return Promise.all(deletePromises);
}



exports.deletePipeline = function (appName, pipelineName) {
    return codepipelineCalls.deletePipeline(appName, pipelineName);
}

