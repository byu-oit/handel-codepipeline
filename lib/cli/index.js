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
const lifecycle = require('../lifecycle');
const winston = require('winston');
const yaml = require('js-yaml');
const input = require('../input');
const AWS = require('aws-sdk');
const util = require('../common/util');
const s3Calls = require('../aws/s3-calls');
const iamCalls = require('../aws/iam-calls');

function getCodePipelineBucketName(accountConfig) {
    return `codepipeline-${accountConfig.region}-${accountConfig.account_id}`;
}

function validatePipelineSpec(handelCodePipelineFile) {
    let validateErrors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
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

    if (hadErrors) {
        winston.error("Errors were found while validating your Handel-CodePipeline file");
        process.exit(1);
    }
}

function validateCredentials(accountConfig) {
    let deployAccount = accountConfig.account_id;
    winston.debug(`Checking that current credentials match account ${deployAccount}`);
    return iamCalls.showAccount().then(discoveredId => {
        winston.debug(`Currently logged in under account ${discoveredId}`);
        if(!discoveredId) {
            winston.error(`You are not logged into the account ${deployAccount}`);
            process.exit(1);
        }
        else if (deployAccount === discoveredId) { 
            return;
        }
        else {
            winston.error(`You are trying to deploy to the account ${deployAccount}, but you are logged into the account ${discoveredId}`);
            process.exit(1);
        }        
    });
}

exports.deployAction = function (handelCodePipelineFile, args) {
    if(!args) {
        winston.info("Welcome to the Handel CodePipeline setup wizard");
    }
    let phaseDeployers = util.getPhaseDeployers();
    validatePipelineSpec(handelCodePipelineFile);
    checkPhases(handelCodePipelineFile, phaseDeployers);

    input.getPipelineConfigForDeploy(args)
        .then(pipelineConfig => {
            let accountConfig;
            if(!pipelineConfig.accountConfig) {
                let accountName = pipelineConfig.accountName;
                accountConfig = util.getAccountConfig(pipelineConfig.accountConfigsPath, accountName);
            } else {
                accountConfig = pipelineConfig.accountConfig
            }
            return validateCredentials(accountConfig)
                .then(() => {
                    AWS.config.update({ region: accountConfig.region });
                    let pipelineName = pipelineConfig.pipelineToDeploy;
        
                    if(!handelCodePipelineFile.pipelines[pipelineName]) {
                        throw new Error(`The pipeline '${pipelineName}' you specified doesn't exist in your Handel-Codepipeline file`);
                    }
        
                    let codePipelineBucketName = getCodePipelineBucketName(accountConfig);
                    return s3Calls.createBucketIfNotExists(codePipelineBucketName, accountConfig.region)
                        .then(bucket => {
                            return lifecycle.getPhaseSecrets(phaseDeployers, handelCodePipelineFile, pipelineName, args)
                                .then(phasesSecrets => {
                                    return lifecycle.deployPhases(phaseDeployers, handelCodePipelineFile, pipelineName, accountConfig, phasesSecrets, codePipelineBucketName)
                                })
                                .then(pipelinePhases => {
                                    return lifecycle.deployPipeline(handelCodePipelineFile, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
                                })
                                .then(pipeline => {
                                    winston.info(`Finished creating pipeline in ${accountConfig.account_id}`);
                                });
                        });
                });
        })
        .catch(err => {
            winston.error(`Error setting up Handel CodePipeline: ${err.message}`);
            // winston.error(err);
        });
}

exports.checkAction = function (handelCodePipelineFile) {
    let phaseDeployers = util.getPhaseDeployers();
    validatePipelineSpec(handelCodePipelineFile);
    checkPhases(handelCodePipelineFile, phaseDeployers);
    winston.info("No errors were found in your Handel-CodePipeline file");
}

exports.deleteAction = function (handelCodePipelineFile) {
    winston.info("Welcome to the Handel CodePipeline deletion wizard");

    let phaseDeployers = util.getPhaseDeployers();

    input.getPipelineConfigForDelete()
        .then(pipelineConfig => {
            let accountName = pipelineConfig.accountName;
            let accountConfig = util.getAccountConfig(pipelineConfig.accountConfigsPath, accountName);

            return validateCredentials(accountConfig)
                .then(() => {
                    AWS.config.update({ region: accountConfig.region });
                    let codePipelineBucketName = getCodePipelineBucketName(accountConfig);
                    let pipelineName = pipelineConfig.pipelineToDelete;
                    let appName = handelCodePipelineFile.name
        
                    return lifecycle.deletePipeline(appName, pipelineName)
                        .then(deleteResult => {
                            return lifecycle.deletePhases(phaseDeployers, handelCodePipelineFile, pipelineName, accountConfig, codePipelineBucketName)
                        })
                        .catch(err => {
                            winston.error(`Error deleting Handel CodePipeline: ${err}`);
                            winston.error(err);
                        });
                });
        });

}

exports.listSecretsAction = function (handelCodePipelineFile, args) {
    if(args && args.pipeline) {
        let phaseDeployers = util.getPhaseDeployers();
        let secrets = handelCodePipelineFile.pipelines[args.pipeline]
        secrets.phases.forEach((phase) => {
            let phaseDeployer = phaseDeployers[phase.type]
            let inquirerSecrets = phaseDeployer.secretsRequired;
            inquirerSecrets.forEach(question => {
                if(!phase.secrets) {
                    phase.secrets = [];
                }
                phase.secrets.push({
                    name: question.name
                })
            })
        })
        console.log(yaml.safeDump(secrets));
        return;
    } else {
        winston.error('The --pipeline parameter is required.')
        throw Error('The --pipeline parameter is required for the listSecrets phase')
    }
}