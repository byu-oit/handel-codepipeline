const AWS = require('aws-sdk');
const handel = require('handel');

function pollForJobs(codePipeline) {
    console.log("Polling for jobs");
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
            console.log(pollResults.jobs[0].data);
            return pollResults.jobs;
        });
}

function reportJobStart(codePipeline, job) {
    var reportParams = {
        jobId: job.id,
        nonce: job.nonce
    };
    return codePipeline.acknowledgeJob(reportParams).promise()
        .then(reportResult => {
            console.log(`Reserved job ${job.id}`);
            return reportResult;
        })
        .catch(err => {
            if(err.code === 'InvalidNonceException') {
                console.log(`Job ${job.id} was already reserved`);
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
                    reservedJobs.push[jobs];
                }
            }
            return reservedJobs;
        });
}



function reportJobProgress(codePipeline, jobs) {

}

function reportJobSuccess(codePipeline, job) {
    var params = {
        jobId: job.id,
        currentRevision: {
            changeIdentifier: 'STRING_VALUE', /* required */
            revision: 'STRING_VALUE', /* required */
            created: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
            revisionSummary: 'STRING_VALUE'
        },
        executionDetails: {
            externalExecutionId: 'STRING_VALUE',
            percentComplete: 0,
            summary: `Successfully deployed the environments ${job.data.actionConfiguration.configuration.EnvironmentsToDeploy}`
        }
    };
    return codePipeline.putJobSuccessResult(params).promise()
        .then(reportSuccess => {

        });
}

function reportJobFailure(codePipeline, job) {
    
}

// function executeHandelJob(codePipeline, job) {

//     return reportJobCompletion(codePipeline, job)

//     // return handel.deploy(accountConfigFileName, deploySpecFileName, environmentToDeploy, deployVersion)
//     //     .then(result => {

//     //     })
//     //     .catch(err => {

//     //     });
// }

/** 
 * Polls for CodePipeline jobs to execute
 */
exports.executeHandelJobs = function() {
    const codePipeline = new AWS.CodePipeline({apiVersion: '2015-07-09'});
    
    //Execute jobs asynchronously
    pollForJobs(codePipeline)
        .then(jobs => { //Request jobs
            return acknowledgeJobs(codePipeline, jobs);
        })
        .then(jobs => { //Execute jobs that were able to be requested
            console.log("Executing handel jobs");
        })
        .then(jobs => {

        });
}