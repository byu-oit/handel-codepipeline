const AWS = require('aws-sdk');

function getActionType(codePipeline) {
    let listParams = {
        actionOwnerFilter: "Custom"
    }
    return codePipeline.listActionTypes(listParams).promise()
        .then(listResponse => {
            let actionTypes = listResponse.actionTypes;
            for(let actionType of actionTypes) {
                let id = actionType.id;
                if(id.category === "Deploy" && id.provider === "Handel" && id.version === "1") {
                    return actionType;
                }
            }
            return null;
        });
}

function createHandelActionIfNotExists(codePipeline, handelWorkerUrl) {
    return getActionType(codePipeline)
        .then(actionType => {
            if(!actionType) {
                console.log("Creating Handel action type");
                let actionParams = {
                    "category": "Deploy",
                    "provider": "Handel",
                    "version": "v2",
                    "settings": {
                        "entityUrlTemplate": `${handelWorkerUrl}/project/{Config:ProjectName}`,
                        "executionUrlTemplate": `${handelWorkerUrl}/project/{Config:ProjectName}/log/{ExternalExecutionId}`
                    },
                    "configurationProperties": [
                        {
                            "name": "ProjectName",
                            "required": true,
                            "key": true,
                            "secret": false,
                            "queryable": false,
                            "description": "The name of the build project must be provided when this action is added to the pipeline.",
                            "type": "String"
                        },
                        {
                            "name": "EnvironmentsToDeploy",
                            "required": true,
                            "key": false,
                            "secret": false,
                            "queryable": false,
                            "description": "The comma-separated list of environments from the Handel file to be deployed in this phase.",
                            "type": "String"
                        }
                    ],
                    "inputArtifactDetails": {
                        "maximumCount": 1,
                        "minimumCount": 1
                    },
                    "outputArtifactDetails": {
                        "maximumCount": 0,
                        "minimumCount": 0
                    }
                }
                return codePipeline.createCustomActionType(actionParams).promise();
            }
            else {
                console.log("Handel action type already exists");
                return actionType;
            }
        });
}

exports.createHandelActions = function(accountConfigs, handelWorkerStacks) {
    const codePipeline = new AWS.CodePipeline({apiVersion: '2015-07-09'});
    let actionCreatePromises = [];

    let returnCreatedActions = {};

    for(let accountId in accountConfigs) {
        let handelWorkerDnsName = handelWorkerStacks[accountId].Outputs[0].OutputValue;
        let handelWorkerBaseUrl = `http://${handelWorkerDnsName}`;
        let actionCreatePromise = createHandelActionIfNotExists(codePipeline, handelWorkerBaseUrl)
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