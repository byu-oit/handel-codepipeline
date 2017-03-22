const AWS = require('aws-sdk')
const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });

function getSourcePhase(phaseSpec) {
    //TODO - THIS ISNT DONE YET
    return {
        name: phaseSpec.phase_name,
        actions: [
            {
                name: phaseSpec.phase_name,
                actionTypeId: {
                    version: "1",
                    category: "Source",
                    owner: "AWS",
                    provider: "S3"
                },
                configuration: {
                    "S3Bucket": "awscodepipeline-demo-bucket",
                    "S3ObjectKey": "aws-codepipeline-s3-aws-codedeploy_linux.zip"
                },
                inputArtifacts: [
                ],
                outputArtifacts: [
                    {
                        name: "MyApp"
                    }
                ],
                runOrder: 1
            }
        ]
    }
}

function getBuildPhase(phaseSpec) {

}

function getDeployPhase(phaseSpec) {
    // return {
    //     name: "Beta",
    //     actions: [
    //         {
    //             name: "CodePipelineDemoFleet",
    //             actionTypeId: {
    //                 version: "1",
    //                 category: "Deploy",
    //                 owner: "AWS",
    //                 provider: "CodeDeploy"
    //             },
    //             configuration: {
    //                 "ApplicationName": "CodePipelineDemoApplication",
    //                 "DeploymentGroupName": "CodePipelineDemoFleet"
    //             },
    //             inputArtifacts: [
    //                 {
    //                     name: "MyApp"
    //                 }
    //             ],
    //             outputArtifacts: [
    //             ],
    //             runOrder: 1
    //         }
    //     ]
    // }
}

function getPhase(phaseSpec) {
    let phaseType = phaseSpec.phase_type;
    switch(phaseType) {
        case "source":
            return getSourcePhase(phaseSpec);
        case "build":
            return getBuildPhase(phaseSpec);
        case "deploy":
            return getDeployPhase(phaseSpec);
        default:
            throw new Error(`Unsupported phase type specified: ${phaseType}`);
    }
    
}

function createPipeline(accountId, pipelineDefinition, handelFile, workerStack) {
    let pipelineName = `${handelFile.appName}`;

    let createParams = {
        pipeline: {
            version: 1,
            name: pipelineName,
            artifactStore: {
                type: "S3",
                location: `codepipeline-us-west-2-${accountId}`
            },
            roleArn: `arn:aws:iam::${accountId}:role/AWS-CodePipeline-Service`,
            stages: []
        }
    };

    let phasesSpec = pipelineDefinition.pipelines[accountId].phases;
    for(let phaseSpec in phasesSpec) {
        createParams.pipeline.stages.push(getPhase(phaseSpec));
    }

    return codePipeline.createPipeline(createParams).promise()
        .then(result => {
            console.log(result);
            return result;
        });
}


exports.createPipelines = function (handelCodePipelineFile, handelFile, workerStacks) {
    let createPipelinePromises = [];
    let returnPipelines = {};

    for (let accountId in handelCodePipelineFile.pipelines) {
        let pipelineDefinition = handelCodePipelineFile.pipelines[accountId];
        let workerStack = workerStacks[accountId];
        let createPipelinePromise = createPipeline(accountId, pipelineDefinition, handelFile, workerStack)
            .then(pipeline => {
                returnPipelines[accountId] = pipeline;
            });
        createPipelinePromises.push(createPipelinePromise);
    }

    return Promise.all(createPipelinePromises)
        .then(createResult => {
            return returnPipelines; //This is built-up dynamically above
        });
}