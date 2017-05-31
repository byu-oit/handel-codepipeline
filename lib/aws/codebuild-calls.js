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
                if (err.code === 'InvalidInputException') { //Try again because the IAM role isn't available yet
                    setTimeout(function () {
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

function getProjectParams(projectName, appName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec) {
    let projectParams = {
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
    }

        //Override buildspec if specified
    if (buildSpec) {
        projectParams.source.buildspec = buildSpec;
    }

    //Inject pre-provided environment variables
    projectParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_ACCOUNT_ID", accountId.toString()));
    projectParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("AWS_REGION", region));
    projectParams.environment.environmentVariables.push(getCodeBuildEnvVarDef("HANDEL_PIPELINE_NAME", appName));

    //Add environment variables for codebuild project
    for (let envKey in environmentVariables) {
        projectParams.environment.environmentVariables.push(getCodeBuildEnvVarDef(envKey, environmentVariables[envKey]));
    }
    
    return projectParams
}

exports.createProject = function (projectName, appName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec) {
    const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    let projectParams = getProjectParams(projectName, appName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec);

    return createProject(codeBuild, projectParams)
        .then(createResponse => {
            return createResponse.project;
        });
}

exports.updateProject = function (projectName, appName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec) {
    const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    let projectParams = getProjectParams(projectName, appName, imageName, environmentVariables, accountId, serviceRoleArn, region, buildSpec);

    return codeBuild.updateProject(projectParams).promise()
        .then(updateResponse => {
            return updateResponse.project;
        })
}

exports.getProject = function (projectName) {
    const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    var getParams = {
        names: [
            projectName
        ]
    };
    return codeBuild.batchGetProjects(getParams).promise()
        .then(getResults => {
            let projects = getResults.projects;
            if (projects.length === 0) {
                return null; //No project
            }
            else {
                return projects[0];
            }
        });
}

exports.deleteProject = function (projectName) {
    const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    var deleteParams = {
        name: projectName
    };
    return codeBuild.deleteProject(deleteParams).promise();
}