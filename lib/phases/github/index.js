const winston = require('winston');
const inquirer = require('inquirer');

exports.check = function(phaseConfig) {
    let errors = [];

    if(!phaseConfig.owner) {
        errors.push(`GitHub - The 'owner' parameter is required`);
    }
    if(!phaseConfig.repo) {
        errors.push(`GitHub - The 'repo' parameter is required`);
    }
    if(!phaseConfig.branch) {
        errors.push(`GitHub - The 'branch' parameter is required`);
    }
    
    return errors;
}

exports.getSecretsForPhase = function() {
    let questions = [
        {
            type: 'input',
            name: 'githubAccessToken',
            message: 'Please enter your GitHub access token',
        }
    ];
    return inquirer.prompt(questions);
}

exports.createPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating source phase '${phaseContext.phaseName}'`);
    let branch = phaseContext.params.branch || "master";

    return Promise.resolve({
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Source",
                    owner: "ThirdParty",
                    version: "1",
                    provider: "GitHub"
                },
                outputArtifacts: [
                    {
                        name: `Output_Source`
                    }
                ],
                configuration: {
                    Owner: phaseContext.params.owner,
                    Repo: phaseContext.params.repo,
                    Branch: branch,
                    OAuthToken: phaseContext.secrets.githubAccessToken
                },
                runOrder: 1
            }
        ]
    });
}

exports.deletePhase = function(phaseContext, accountConfig) {
    winston.info(`Nothing to delete for source phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}