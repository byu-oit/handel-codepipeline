const AWS = require('aws-sdk');
const winston = require('winston');

function getCodeBuildEnvVarDef(key, value) {
    return {
        name: key,
        value: value
    }
}

function createProject(codeBuild, createParams) {
    const deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    function createProject() {
        codeBuild.createProject(createParams).promise()
            .then(projectResponse => {
                deferred.resolve(projectResponse);
            })
            .catch(err => {
                if(err.code === 'InvalidInputException') { //Try again because the IAM role isn't available yet
                    setTimeout(function() {
                        createProject();
                    }, 5000);  
                }
                else {
                    deferred.reject(err);
                }
            });
    }
    createProject();

    return deferred.promise;
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

    return createProject(codeBuild, createParams)
        .then(createResponse => {
            return createResponse.project;
        });
}