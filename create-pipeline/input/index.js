const inquirer = require('inquirer');
const util = require('../util/util');

function inquirerValidateAWSAccountID(value) {
    if(value.match(/^\d{12}$/)) {
        return true;
    }
    return 'Please enter a valid AWS Account ID';
}

exports.getAccountsForEnvs = function() {
    let questions = [
        {
            type: 'input',
            name: 'prod',
            message: 'What is the AWS Account ID you will use for your prod systems?',
            validate: inquirerValidateAWSAccountID
        },
        {
            type: 'input',
            name: 'stage',
            message: 'What is the AWS Account ID you will use for your stage systems?',
            validate: inquirerValidateAWSAccountID
        },       
        {
            type: 'input',
            name: 'dev',
            message: 'What is the AWS Account ID you will use for your development systems?',
            validate: inquirerValidateAWSAccountID
        }
    ];
    return inquirer.prompt(questions);
}

exports.getConfigForAccounts = function(environments) {
    let accountIds = {};
    for(let envType in environments) {
        let accountId = environments[envType];
        if(!accountIds[accountId]) {
            accountIds[accountId] = [];
        }
        accountIds[accountId].push(envType);
    }

    let questions = [];
    for(let accountId in accountIds) {
        questions.push({
            type: 'input',
            name: accountId,
            message: `Provide the path to the account config file for the account ${accountId} (${accountIds[accountId].join(', ')})`
        });
    }
    return inquirer.prompt(questions)
        .then(answers => {
            let accountConfigs = {};
            for(let accountId in answers) {
                let accountConfigPath = answers[accountId]
                let accountConfig = util.loadYamlFile(accountConfigPath);
                if(!accountConfig) {
                    console.log(`ERROR: Invalid account config file provided: ${accountConfigPath}`);
                    process.exit(1);
                }
                accountConfigs[accountId] = accountConfig;
            }
            
            return accountConfigs;
        });
}