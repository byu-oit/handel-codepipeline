const codepipelineCalls = require('../aws/codepipeline-calls');
const async = require('async');

function createPhase(phaseContext, phaseDeployers, accountConfig) {
    return new Promise((resolve, reject) => {
        let phaseDeployer = phaseDeployers[phaseContext.phaseType];
        if(!phaseDeployer) {
            return reject(new Error(`Invalid or unsupported pipeline phase type ${phaseContext.phaseType}`));
        }
        else {
            phaseDeployer.createPhase(phaseContext, accountConfig)
                .then(phaseResult => {
                    return resolve(phaseResult);
                })
                .catch(err => {
                    return reject(err);
                });
        }
    });
}

exports.validatePipelineSpec = function(handelFile, handelCodePipelineFile) {
    //TODO - Validate pipeline spec here
}

exports.getPhaseSecrets = function(phaseDeployers, handelCodePipelineFile, pipelineToCreate) {
    return new Promise((resolve, reject) => {
        let inputFunctions = [];

        for(let phaseSpec of handelCodePipelineFile.pipelines[pipelineToCreate].phases) {
            let phaseType = phaseSpec.type;
            let phaseDeployer = phaseDeployers[phaseType];
            inputFunctions.push(function(callback) {
                phaseDeployer.getSecretsForPhase()
                    .then(phaseSecrets => {
                        callback(null, phaseSecrets);
                    })
                    .catch(err => {
                        callback(err, null);
                    })
            });
        }

        async.series(inputFunctions, function(err, results) {
            if(!err) {
                return resolve(results);
            }
            else {
                return reject(err);
            }
        });
    });
}

exports.createPhases = function(phaseDeployers, handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, phasesSecrets) {
    let createPromises = [];

    let pipelinePhases = handelCodePipelineFile.pipelines[pipelineToCreate].phases
    for(let i = 0; i < pipelinePhases.length; i++) {
        let phase = pipelinePhases[i];
        let phaseContext = {
            handelAppName: handelFile.name,
            pipelineName: pipelineToCreate,
            accountConfig: accountConfig,
            phaseType: phase.type,
            phaseName: phase.name,
            params: phase,
            secrets: phasesSecrets[i]
        }

        createPromises.push(createPhase(phaseContext, phaseDeployers, accountConfig));
    }

    return Promise.all(createPromises);
}

exports.createPipeline = function(handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, pipelinePhases) {
    let pipelineDefinition = handelCodePipelineFile.pipelines[pipelineToCreate]
    return codepipelineCalls.createPipeline(pipelineToCreate, handelFile, accountConfig, pipelinePhases);
}

