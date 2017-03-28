const AWS = require('aws-sdk');
const handel = require('handel');
const winston = require('winston');
const fs = require('fs');
const util = require('../util/util');

function pollForJobs(codePipeline) {
    var createParams = {
        actionTypeId: {
            version: "v2", 
            category: "Deploy", 
            owner: "Custom", 
            provider: "Handel"
        }, 
        maxBatchSize: 5
    };
    return codePipeline.pollForJobs(createParams).promise()
        .then(pollResults => {
            return pollResults.jobs;
        });
}

function reportJobStart(codePipeline, job) {
    winston.info(`Reserving job ${job.id}`);
    var reportParams = {
        jobId: job.id,
        nonce: job.nonce
    };
    return codePipeline.acknowledgeJob(reportParams).promise()
        .then(reportResult => {
            winston.info(`Reserved job ${job.id}`);
            return job;
        })
        .catch(err => {
            if(err.code === 'InvalidNonceException') {
                winston.warn(`Job ${job.id} was already reserved`);
                return null;
            }
            throw err;
        });
}

function acknowledgeJobs(codePipeline, jobs) {
    let acknowledgePromises = [];

    for(let job of jobs) {
        acknowledgePromises.push(reportJobStart(codePipeline, job));
    }

    return Promise.all(acknowledgePromises)
        .then(jobs => {
            let reservedJobs = [];
            for(let job of jobs) {
                if(job) {
                    reservedJobs.push(job);
                }
            }
            return reservedJobs;
        });
}

function reportJobSuccess(codePipeline, job) {
    var reportParams = {
        jobId: job.id
    };
    winston.info(`Reporting success for job ${job.id}`);
    return codePipeline.putJobSuccessResult(reportParams).promise()
        .then(reportSuccess => {
            winston.info(`Reported success for job ${job.id}`);
            return reportSuccess;
        });
}

function reportJobFailure(codePipeline, job, message) {
    var reportParams = {
        failureDetails: {
            message: message,
            type: 'JobFailed'
        },
        jobId: job.id
    };
    winston.info(`Reporting failure for job ${job.id}`);
    return codePipeline.putJobFailureResult(reportParams).promise()
        .then(reportFailure => {
            winston.info(`Reported failure for job ${job.id}`);
            return reportFailure;
        });
}


function getDeployableArtifact(job, downloadPath) {
    return new Promise((resolve, reject) => {
        winston.info(`Downloading deployable artifact for ${job.id}`);
        let inputArtifact = job.data.inputArtifacts[0].location.s3Location;
        let artifactCredentials = job.data.artifactCredentials;
        let zipFilePath = `/tmp/${job.id}.zip`;
        util.downloadFileFromS3(zipFilePath, inputArtifact.bucketName, inputArtifact.objectKey, artifactCredentials.accessKeyId, artifactCredentials.secretAccessKey, artifactCredentials.sessionToken)
            .then(() => {
                util.unzipFileToDirectory(zipFilePath, downloadPath);
                fs.unlinkSync(zipFilePath);
                resolve();
            });
    });
}

function executeJob(codePipeline, job) {
    let handelCodePipelineBaseDir = `/mnt/share/handel-worker`;
    let jobDir = `${handelCodePipelineBaseDir}/jobs/${job.data.pipelineContext.pipelineName}/${job.id}/`;
    return getDeployableArtifact(job, jobDir)
        .then(() => {
            let accountConfigFilePath = `${handelCodePipelineBaseDir}/account-config.yml`;
            let handelFilePath = `${jobDir}/handel.yml`;
            let environmentsToDeploy = job.data.actionConfiguration.configuration.EnvironmentsToDeploy.split(",");
            winston.info(`Executing Handel to deploy the environments ${environmentsToDeploy}`)
            return handel.deploy(accountConfigFilePath, handelFilePath, environmentsToDeploy, job.id)
                .then(envDeployResults => {
                    let failureMessages = [];
                    for(let envDeployResult of envDeployResults) {
                        if(envDeployResult.status !== 'success') {
                            failureMessages.push(envDeployResult.message);
                        }
                    }

                    if(failureMessages.length > 0) { //Failure
                        winston.warn("One or more environments failed to deploy");
                        return reportJobFailure(codePipeline, job, failureMessages.join("\n"));
                    }
                    else { //Success
                        winston.info("Handel job succeeded");
                        return reportJobSuccess(codePipeline, job);
                    }
                })
                .catch(err => {
                    winston.warn("Handel job failed");
                    return reportJobFailure(codePipeline, job, err.message);
                });
        });
}

function executeJobs(codePipeline, jobs) {
    let executePromises = [];

    for(let job of jobs) {
        executePromises.push(executeJob(codePipeline, job));   
    }

    return Promise.all(executePromises);
}

/** 
 * Polls for CodePipeline jobs to execute
 */
exports.executeHandelJobs = function() {
    const codePipeline = new AWS.CodePipeline({apiVersion: '2015-07-09'});
    
    //Execute jobs asynchronously
    pollForJobs(codePipeline)
        .then(jobs => {
            if(jobs.length !== 0) {
                return acknowledgeJobs(codePipeline, jobs) //Reserve jobs
                    .then(acknowledgedJobs => {  //Execute jobs that were able to be requested
                        return executeJobs(codePipeline, acknowledgedJobs);
                    });
            }
        })
        .catch(err => {
            winston.warn(`Error during job execution ${err}`);
            winston.warn(err);
        });
}