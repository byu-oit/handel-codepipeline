const AWS = require('aws-sdk');
const codePipeline = new AWS.CodePipeline({apiVersion: '2015-07-09'});

function createHandelActionIfNotExists(handelWorkerUrl) {
    let actionParams = {
        "category": "Deploy",
        "provider": "Handel",
        "version": "1",
        "settings": {
            "entityUrlTemplate": `${handelWorkerUrl}/{Config:ProjectName}/`,
            "executionUrlTemplate": `${handelWorkerUrl}/{Config:ProjectName}/lastSuccessfulBuild/{ExternalExecutionId}/`
        },
        "configurationProperties": [{
            "name": "ProjectName",
            "required": true,
            "key": true,
            "secret": false,
            "queryable": false,
            "description": "The name of the build project must be provided when this action is added to the pipeline.",
            "type": "String"
        }],
        "inputArtifactDetails": {
            "maximumCount": 1,
            "minimumCount": 1
        },
        "outputArtifactDetails": {
            "maximumCount": 0,
            "minimumCount": 0
        }
    }
    return codePipeline.createCustomActionType(actionParams).promise()
        .then(createdActionType => {
            return createdActionType;
        });
}

exports.createHandelActions = function(accountConfigs, handelWorkerStacks) {
    let actionCreatePromises = [];

    let returnCreatedActions = {};

    for(let accountId in accountConfigs) {
        let handelWorkerDnsName = handelWorkerStacks[accountId].Outputs[0].OutputValue;
        let handelWorkerBaseUrl = `http://${handelWorkerDnsName}`;
        let actionCreatePromise = createHandelActionIfNotExists(handelWorkerBaseUrl)
            .then(createdAction => {
                returnCreatedActions[accountId] = createdAction;
            })
        actionCreatePromises.push(actionCreatePromise);
    }

    return Promise.all(actionCreatePromises)
        .then(results => {
            return returnCreatedActions;
        });
}