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
        }
    ];
    return inquirer.prompt(questions)
        .then(answers => {
            let configFiles = {};
            configFiles.handel = util.loadYamlFile(answers.handel);
            configFiles.handelCodePipeline = util.loadYamlFile(answers.handelCodePipeline);
            return configFiles;
        });
}

exports.getAccountConfigs = function(handelCodePipelineFile) {
    let accountConfigs = {};

    for(let accountId in handelCodePipelineFile.pipelines) {
        let accountConfigFilePath = `${os.homedir()}/.handel-codepipeline/${accountId}.yml`
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
