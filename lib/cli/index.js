const lifecycle = require('../lifecycle');
const winston = require('winston');
const input = require('../input');
const AWS = require('aws-sdk');
const util = require('../util/util');
const s3Calls = require('../aws/s3-calls');

function getCodePipelineBucketName(accountConfig) {
    return `codepipeline-${accountConfig.region}-${accountConfig.account_id}`;
}

function validatePipelineSpec(handelFile, handelCodePipelineFile) {
    let validateErrors = lifecycle.validatePipelineSpec(handelFile, handelCodePipelineFile);
    if (validateErrors.length > 0) {
        winston.error("Errors while validating handel-codepipeline.yml file:");
        console.log(validateErrors.join('\n'));
        process.exit(1);
    }
}

function checkPhases(handelCodePipelineFile, phaseDeployers) {
    let pipelinePhaseErrors = lifecycle.checkPhases(handelCodePipelineFile, phaseDeployers);
    let hadErrors = false;
    for (let pipelineName in pipelinePhaseErrors) {
        let pipelineErrors = pipelinePhaseErrors[pipelineName];
        if (pipelineErrors.length > 0) {
            winston.error(`Errors in pipeline '${pipelineName}': `)
            console.log(pipelineErrors.join('\n'));
            hadErrors = true;
        }
    }

    if (!hadErrors) {
        winston.info("No errors were found in your Handel-CodePipeline file");
    }
    else {
        winston.error("Errors were found while validating your Handel-CodePipeline file");
        process.exit(1);
    }
}

exports.createAction = function (handelFile, handelCodePipelineFile) {
    winston.info("Welcome to the Handel CodePipeline setup wizard");
    let phaseDeployers = util.getPhaseDeployers();
    validatePipelineSpec(handelFile, handelCodePipelineFile);
    checkPhases(handelCodePipelineFile, phaseDeployers);

    input.getPipelineConfigForCreate()
        .then(pipelineConfig => {
            let accountName = pipelineConfig.accountName;
            let accountConfig = util.getAccountConfig(pipelineConfig.accountConfigsPath, accountName);
            AWS.config.update({ region: accountConfig.region });
            let pipelineToCreate = pipelineConfig.pipelineToCreate;

            lifecycle.validatePipelineSpec(handelFile, handelCodePipelineFile);

            let codePipelineBucketName = getCodePipelineBucketName(accountConfig);
            return s3Calls.createBucketIfNotExists(codePipelineBucketName, accountConfig.region)
                .then(bucket => {
                    return lifecycle.getPhaseSecrets(phaseDeployers, handelCodePipelineFile, pipelineToCreate)
                        .then(phasesSecrets => {
                            return lifecycle.createPhases(phaseDeployers, handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, phasesSecrets, codePipelineBucketName)
                        })
                        .then(pipelinePhases => {
                            return lifecycle.createPipeline(handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, pipelinePhases, codePipelineBucketName);
                        })
                        .then(pipeline => {
                            winston.info(`Finished creating pipeline in ${accountConfig.account_id}`);
                        });

                })
        })
        .catch(err => {
            winston.error(`Error setting up Handel CodePipeline: ${err}`);
            winston.error(err);
        });
}

exports.checkAction = function (handelFile, handelCodePipelineFile) {
    let phaseDeployers = util.getPhaseDeployers();
    validatePipelineSpec(handelFile, handelCodePipelineFile);
    checkPhases(handelCodePipelineFile, phaseDeployers);
}

exports.deleteAction = function (handelFile, handelCodePipelineFile) {
    winston.info("Welcome to the Handel CodePipeline deletion wizard");

    let phaseDeployers = util.getPhaseDeployers();

    input.getPipelineConfigForDelete()
        .then(pipelineConfig => {
            let accountName = pipelineConfig.accountName;
            let accountConfig = util.getAccountConfig(pipelineConfig.accountConfigsPath, accountName);
            AWS.config.update({ region: accountConfig.region });
            let codePipelineBucketName = getCodePipelineBucketName(accountConfig);
            let pipelineToDelete = pipelineConfig.pipelineToDelete;
            let handelAppName = handelFile.name

            return lifecycle.deletePipeline(handelAppName)
                .then(deleteResult => {
                    return lifecycle.deletePhases(phaseDeployers, handelCodePipelineFile, handelFile, pipelineToDelete, accountConfig, codePipelineBucketName)
                })
                .catch(err => {
                    winston.error(`Error deleting Handel CodePipeline: ${err}`);
                    winston.error(err);
                });
        });

}