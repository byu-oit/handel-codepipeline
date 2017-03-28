const AWS = require('aws-sdk');
const s3Calls = require('../aws/s3-calls');
const codeBuildCalls = require('../aws/codebuild-calls');

function validatePipelineDefinition(pipelineDefinition) {
    let phases = pipelineDefinition.phases;
    if(phases[0].phase_type !== 'source') {
        throw new Error("The first phase of your pipeline must be a source phase");
    }
    if(phases[1].phase_type !== 'build') {
        throw new Error("The second phase of your pipeline must be a build phase");
    }
}

function getSourcePhase(phaseSpec) {
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

function getBuildPhase(sourcePhaseSpec, phaseSpec, handelFile) {
    if (!sourcePhaseSpec) {
        throw new Error("Build phase has no Source phase from which to consume artifacts");
    }

    return {
        name: phaseSpec.phase_name,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_${sourcePhaseSpec.phase_name}`
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
                    ProjectName: codeBuildCalls.getBuildProjectName(handelFile.name)
                },
                runOrder: 1
            }
        ]
    }
}

function getDeployPhase(buildPhaseSpec, phaseSpec, handelFile) {
    if (!buildPhaseSpec) {
        throw new Error("Deploy phase has no Build phase from which to consume artifacts");
    }

    //TODO - Validate the envs are in the handel file
    return {
        name: phaseSpec.phase_name,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_${buildPhaseSpec.phase_name}`
                    }
                ],
                name: phaseSpec.phase_name,
                actionTypeId: {
                    category: "Test",
                    owner: "AWS",
                    version: "1",
                    provider: "CodeBuild"
                },
                configuration: {
                    ProjectName: codeBuildCalls.getDeployProjectName(handelFile.name, phaseSpec.envs)
                },
                runOrder: 1
            }
        ]
    }
}

function getPhase(sourcePhaseSpec, buildPhaseSpec, phaseSpec, handelFile) {
    let phaseType = phaseSpec.phase_type;
    switch (phaseType) {
        case "source":
            return getSourcePhase(phaseSpec);
        case "build":
            return getBuildPhase(sourcePhaseSpec, phaseSpec, handelFile);
        case "deploy":
            return getDeployPhase(buildPhaseSpec, phaseSpec, handelFile);
        default:
            throw new Error(`Unsupported phase type specified: ${phaseType}`);
    }
}

function createCodePipelineProject(codePipeline, accountId, projectName, codePipelineBucketName, pipelineDefinition, handelFile) {
    let createParams = {
        pipeline: {
            version: 1,
            name: projectName,
            artifactStore: {
                type: "S3",
                location: codePipelineBucketName
            },
            roleArn: `arn:aws:iam::${accountId}:role/AWS-CodePipeline-Service`,
            stages: []
        }
    };

    let phasesSpec = pipelineDefinition.phases;
    //Add source phase (required)
    let sourcePhaseSpec = phasesSpec[0];
    if(!sourcePhaseSpec || sourcePhaseSpec.phase_type !== 'source') {
        throw new Error("Source phase is required and must be the first phase of the pipeline");
    }
    createParams.pipeline.stages.push(getPhase(null, null, sourcePhaseSpec, handelFile));
    //Add build phase (required)
    let buildPhaseSpec = phasesSpec[1];
    if(!buildPhaseSpec || buildPhaseSpec.phase_type !== 'build') {
        throw new Error("Build phase is required and must be the second phase of the pipeline");
    }
    createParams.pipeline.stages.push(getPhase(sourcePhaseSpec, null, buildPhaseSpec, handelFile));

    //Add remaining phases (if any)
    for (let i = 2; i < phasesSpec.length; i++) {
        let phaseSpec = phasesSpec[i];
        createParams.pipeline.stages.push(getPhase(sourcePhaseSpec, buildPhaseSpec, phaseSpec, handelFile));
    }
    
    return codePipeline.createPipeline(createParams).promise()
        .then(createResult => {
            return createResult.pipeline;
        });
}

function createPipeline(codePipeline, accountId, pipelineDefinition, handelFile, accountConfig) {
    validatePipelineDefinition(pipelineDefinition);

    let codePipelineBucketName = `codepipeline-us-west-2-${accountId}`
    let projectName = handelFile.name;
    return s3Calls.createBucketIfNotExists(codePipelineBucketName)
        .then(bucket => {
            return createCodePipelineProject(codePipeline, accountId, projectName, codePipelineBucketName, pipelineDefinition, handelFile);
        });
}


exports.createPipelines = function (handelCodePipelineFile, handelFile, accountConfigs) {
    const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
    let createPipelinePromises = [];
    let returnPipelines = {};

    for (let accountId in handelCodePipelineFile.pipelines) {
        let pipelineDefinition = handelCodePipelineFile.pipelines[accountId];
        let accountConfig = accountConfigs[accountId];
        let createPipelinePromise = createPipeline(codePipeline, accountId, pipelineDefinition, handelFile, accountConfig)
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