const AWS = require('aws-sdk');

function getCodeBuildEnvVarDef(key, value) {
    return {
        name: key,
        value: value
    }
}

exports.getBuildProjectName = function(handelFileName) {
    return `${handelFileName}-build`;
}

exports.getDeployProjectName = function(handelFileName, envsToDeploy) {
    return `${handelFileName}-deploy-${envsToDeploy.join("-")}`
}

exports.createProject = function (projectName, handelFileName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec) {
    const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    var createParams = {
        name: projectName,
        description: projectName,
        source: {
            type: 'CODEPIPELINE'
        },
        artifacts: {
            type: 'CODEPIPELINE'
        },
        environment: {
            computeType: 'BUILD_GENERAL1_SMALL',
            image: imageName,
            type: 'LINUX_CONTAINER',
            environmentVariables: []
        },
        serviceRole: serviceRoleArn,
        tags: [
            {
                key: 'Name',
                value: projectName
            }
        ]
    };

    //Override buildspec if specified
    if(buildSpec) {
        createParams.source.buildspec = buildSpec;
    }

    //Inject pre-provided environment variables
    createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_ACCOUNT_ID", accountId.toString()));
    createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_REGION", region));
    createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("HANDEL_PIPELINE_NAME", handelFileName));

    //Add environment variables for codebuild project
    for(let envKey in environmentVariables) {
        createParams.environment.environmentVariables.push(getCodeBuildEnvVarDef(envKey, environmentVariables[envKey]));
    }

    return codeBuild.createProject(createParams).promise()
        .then(createResponse => {
            return createResponse.project;
        });
}