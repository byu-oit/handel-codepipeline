const AWS = require('aws-sdk');

exports.createProject = function (projectName, imageName, environmentVariables, accountId) {
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
        serviceRole: `arn:aws:iam::${accountId}:role/CodeBuildServiceRole`,
        tags: [
            {
                key: 'Name',
                value: projectName
            }
        ]
    };

    //Add environment variables for codebuild project
    for(let envKey in environmentVariables) {
        createParams.environment.environmentVariables.push({
            name: envKey,
            value: environmentVariables[envKey]
        });
    }
    
    return codeBuild.createProject(createParams).promise()
        .then(createResponse => {
            return createResponse.project;
        });
}