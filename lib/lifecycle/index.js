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
    let errors = [];

    if(!handelCodePipelineFile.pipelines || Object.keys(handelCodePipelineFile.pipelines).length === 0) {
        errors.push("You must specify at least one or more pipelines in the 'pipelines' field");
    }
    else {
        for(let pipelineName in handelCodePipelineFile.pipelines) {
            let pipelineDef = handelCodePipelineFile.pipelines[pipelineName]
            if(!pipelineDef.phases) {
                errors.push(`You must specify at least one or more phases in your pipeline ${pipelineName}`);
            }
            else {
                //Validate first phase is github
                if(pipelineDef.phases.length < 2) {
                    errors.push(`You must specify at least two phases: github and codebuild`);
                }
                else {
                    if(pipelineDef.phases[0].type !== 'github') {
                        errors.push(`The first phase in your pipeline ${pipelineName} must be a github phase`)
                    }
                    if(pipelineDef.phases[1].type !== 'codebuild') {
                        errors.push(`The second phase in your application ${pipelineName} must be a codebuild phase`);
                    }
                }

                //Validate each phase has a type and name
                for(let phaseSpec of pipelineDef.phases) {
                    if(!phaseSpec.type) {
                        errors.push(`You must specify a type for all the phases in your pipeline ${pipelineName}`);
                    }
                    if(!phaseSpec.name) {
                        errors.push(`You must specify a name for all the phases in your pipeline ${pipelineName}`);
                    }
                }
            }
        }
    }

    return errors;
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

exports.createPhases = function(phaseDeployers, handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, phasesSecrets, codePipelineBucketName) {
    let createPromises = [];

    let pipelinePhases = handelCodePipelineFile.pipelines[pipelineToCreate].phases
    for(let i = 0; i < pipelinePhases.length; i++) {
        let phase = pipelinePhases[i];
        let phaseContext = {
            handelAppName: handelFile.name,
            codePipelineBucketName: codePipelineBucketName,
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

exports.createPipeline = function(handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, pipelinePhases, codePipelineBucketName) {
    let pipelineDefinition = handelCodePipelineFile.pipelines[pipelineToCreate]
    return codepipelineCalls.createPipeline(pipelineToCreate, handelFile, accountConfig, pipelinePhases, codePipelineBucketName);
}

