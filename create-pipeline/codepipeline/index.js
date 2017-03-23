const AWS = require('aws-sdk');
const s3Calls = require('../aws/s3-calls');

function getSourcePhase(prevPhaseSpec, phaseSpec) {
    return {
        name: phaseSpec.phase_name,
        actions: [
            {
                inputArtifacts: [],
                name: phaseSpec.phase_name,
                actionTypeId: {
                    category: "Source",
                    owner: "ThirdParty",
                    version: "1",
                    provider: "GitHub"
                },
                outputArtifacts: [
                    {
                        name: `Output_${phaseSpec.phase_name}`
                    }
                ],
                configuration: {
                    Owner: phaseSpec.owner,
                    Repo: phaseSpec.repo,
                    Branch: phaseSpec.branch,
                    OAuthToken: phaseSpec.access_token
                },
                runOrder: 1
            }
        ]
    }
}

function getBuildPhase(prevPhaseSpec, phaseSpec, handelFile) {
    if (!prevPhaseSpec) {
        throw new Error("Build phase has no previous phase from which to consume artifacts");
    }

    return {
        name: phaseSpec.phase_name,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_${prevPhaseSpec.phase_name}`
                    }
                ],
                name: phaseSpec.phase_name,
                actionTypeId: {
                    category: "Build",
                    owner: "AWS",
                    version: "1",
                    provider: "CodeBuild"
                },
                outputArtifacts: [
                    {
                        name: `Output_${phaseSpec.phase_name}`
                    }
                ],
                configuration: {
                    ProjectName: handelFile.name
                },
                runOrder: 1
            }
        ]
    }
}

// function getDeployPhase(prevPhaseSpec, phaseSpec, handelFile) {
//     return {
//         "name": phaseSpec.phase_name,
//         "actions": [
//             {
//                 "name": phaseSpec.phase_name,
//                 "actionTypeId": {
//                     "category": "Deploy",
//                     "owner": "Custom",
//                     "version": "1",
//                     "provider": "Handel"
//                 },
//                 "inputArtifacts": [
//                     {
//                         "name": `Output_${prevPhaseSpec.phase_name}`
//                     }
//                 ],
//                 "configuration": {
//                     "ProjectName": handelFile.name
//                 },
//                 "runOrder": 1
//             }
//         ]
//     }
// }

function getPhase(prevPhaseSpec, phaseSpec, handelFile) {
    let phaseType = phaseSpec.phase_type;
    switch (phaseType) {
        case "source":
            return getSourcePhase(prevPhaseSpec, phaseSpec);
        case "build":
            return getBuildPhase(prevPhaseSpec, phaseSpec, handelFile);
        // case "deploy":
        //     return getDeployPhase(prevPhaseSpec, phaseSpec, handelFile);
        default:
            throw new Error(`Unsupported phase type specified: ${phaseType}`);
    }

}

function createPipeline(codePipeline, accountId, pipelineDefinition, handelFile, workerStack) {
    let codePipelineBucketName = `codepipeline-us-west-2-${accountId}`
    return s3Calls.createBucketIfNotExists(codePipelineBucketName)
        .then(bucket => {
            let createParams = {
                pipeline: {
                    version: 1,
                    name: handelFile.name,
                    artifactStore: {
                        type: "S3",
                        location: codePipelineBucketName
                    },
                    roleArn: `arn:aws:iam::${accountId}:role/AWS-CodePipeline-Service`,
                    stages: []
                }
            };

            let phasesSpec = pipelineDefinition.phases;
            for (let i = 0; i < phasesSpec.length; i++) {
                let prevPhaseSpec = null;
                if (phasesSpec[i - 1]) {
                    prevPhaseSpec = phasesSpec[i - 1];
                }
                let phaseSpec = phasesSpec[i];
                createParams.pipeline.stages.push(getPhase(prevPhaseSpec, phaseSpec, handelFile));
            }
            
            return codePipeline.createPipeline(createParams).promise()
                .then(createResult => {
                    return createResult.pipeline;
                });
        });
}


exports.createPipelines = function (handelCodePipelineFile, handelFile, workerStacks) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
    let createPipelinePromises = [];
    let returnPipelines = {};

    for (let accountId in handelCodePipelineFile.pipelines) {
        let pipelineDefinition = handelCodePipelineFile.pipelines[accountId];
        let workerStack = workerStacks[accountId];
        let createPipelinePromise = createPipeline(codePipeline, accountId, pipelineDefinition, handelFile, workerStack)
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