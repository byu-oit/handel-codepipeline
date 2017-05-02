const inquirer = require('inquirer');
const util = require('../util/util');
const fs = require('fs');
const os = require('os');
const HANDEL_CODEPIPELINE_DIR = `${os.homedir()}/.handel-codepipeline`;
const HANDEL_CODEPIPELINE_CONFIG = `${HANDEL_CODEPIPELINE_DIR}/config.yml`;

function inquirerValidateFilePath(filePath) {
    if(!fs.existsSync(filePath)) {
        return `File path doesn't exist: ${filePath}`
    }
    return true;
}

function getSlackNotifyUrl() {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        let handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG);
        if(handelCodePipelineConfig.slack_notify_url) {
            return handelCodePipelineConfig.slack_notify_url;
        }
    }
    return null;
}

function cacheSlackNotifyUrl(slackNotifyUrl) {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        let handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG);
        handelCodePipelineConfig.slack_notify_url = slackNotifyUrl;
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
    else {
        let handelCodePipelineConfig = {
            slack_notify_url: slackNotifyUrl
        }
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
}


function getAccountConfigsPath() {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        let handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG);
        if(handelCodePipelineConfig.account_configs_path) {
            return handelCodePipelineConfig.account_configs_path;
        }
    }
    return null;
}

function cacheAccountConfigsPath(accountConfigsPath) {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        let handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG);
        handelCodePipelineConfig.account_configs_path = accountConfigsPath;
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
    else {
        let handelCodePipelineConfig = {
            account_configs_path: accountConfigsPath
        }
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
}

exports.getPipelineConfig = function() {
    let configs = {};
    configs.handel = util.loadYamlFile("./handel.yml");
    if(!configs.handel) { throw new Error("Missing handel.yml file in the current directory"); }
    configs.handelCodePipeline = util.loadYamlFile("./handel-codepipeline.yml");
    if(!configs.handelCodePipeline) { throw new Error("Missing handel-codepipeline.yml file in the current directory"); }

    let questions = [
        {
            type: 'input',
            name: 'pipelineToCreate',
            message: 'Please enter the name of the pipeline from your handel-codepipeline.yml file that you would like to create',
        },
        {
            type: 'input',
            name: 'accountName',
            message: 'Please enter the name of the account where your pipeline will be created',
        }
    ];

    //TODO - THERE ARE SEVERAL THINGS USING THIS CACHE PATTERN NOW, NEED REFACTOR TO REDUCE CODE DUPLICATION

    //Get account configs
    let accountConfigsPath = getAccountConfigsPath();
    if(accountConfigsPath) {
        configs.accountConfigsPath = accountConfigsPath;
    }
    else {
        questions.push({
            type: 'input',
            name: 'accountConfigsPath',
            message: 'Please enter the path to the directory containing the Handel account configuration files',
            validate: inquirerValidateFilePath
        });
    }

    return inquirer.prompt(questions)
        .then(answers => {
            if(answers.accountConfigsPath) {
                configs.accountConfigsPath = answers.accountConfigsPath;
                cacheAccountConfigsPath(answers.accountConfigsPath);
            }
            configs.pipelineToCreate = answers.pipelineToCreate;
            configs.accountName = answers.accountName;
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
