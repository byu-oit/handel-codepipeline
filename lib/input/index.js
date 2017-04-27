const inquirer = require('inquirer');
const util = require('../util/util');
const fs = require('fs');
const os = require('os');

function inquirerValidateFilePath(filePath) {
    if(!fs.existsSync(filePath)) {
        return `File path doesn't exist: ${filePath}`
    }
    return true;
}

exports.getConfigFiles = function() {
    let questions = [
        {
            type: 'input',
            name: 'handel',
            message: "Please enter the path to the application's Handel config file", 
            validate: inquirerValidateFilePath
        },
        {
            type: 'input',
            name: 'handelCodePipeline',
            message: 'Please enter the path to the Handel-CodePipeline config file',
            validate: inquirerValidateFilePath
        },
        {
            type: 'input',
            name: 'accountConfigsPath',
            message: 'Please enter the path to the directory containing the Handel account configuration files',
            validate: inquirerValidateFilePath
        },
        {
            type: 'input', 
            name: 'githubAccessToken',
            message: 'Please enter a valid GitHub access token (CodePipeline will use this to pull your repo)'
        }
    ];
    return inquirer.prompt(questions)
        .then(answers => {
            let configs = {};
            configs.handel = util.loadYamlFile(answers.handel);
            configs.handelCodePipeline = util.loadYamlFile(answers.handelCodePipeline);
            configs.accountConfigsPath = answers.accountConfigsPath;
            configs.githubAccessToken = answers.githubAccessToken;
            return configs;
        });
}

exports.getAccountIdsFromPipelineNames = function(pipelineNames) {
    let questions = [];
    for(let pipelineName of pipelineNames) {
        questions.push({
            type: 'input',
            name: pipelineName,
            message: `What is the ID of the account you wish to use for your pipeline '${pipelineName}'`, 
        })
    }
    return inquirer.prompt(questions);
}

exports.getAccountConfigs = function(accountConfigsPath, pipelinesToAccountsMapping) {
    let accountConfigs = {};

    for(let pipelineName in pipelinesToAccountsMapping) {
        let accountId = pipelinesToAccountsMapping[pipelineName];
        let accountConfigFilePath = `${accountConfigsPath}/${accountId}.yml`
        if(fs.existsSync(accountConfigFilePath)) {
            let accountConfig = util.loadYamlFile(accountConfigFilePath);
            accountConfigs[accountId] = accountConfig;
        }
        else {
            throw new Error(`Expected account config file at ${accountConfigFilePath} for ${accountId}`);
        }
    }

    return accountConfigs;
}
