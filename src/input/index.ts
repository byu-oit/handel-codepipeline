/*
 * Copyright 2017 Brigham Young University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as os from 'os';
import * as util from '../common/util';
import { PhaseSecrets } from '../datatypes/index';
import { ParsedArgs } from 'minimist';

const HANDEL_CODEPIPELINE_DIR = `${os.homedir()}/.handel-codepipeline`;
const HANDEL_CODEPIPELINE_CONFIG = `${HANDEL_CODEPIPELINE_DIR}/config.yml`;

interface ConfigParamCache {
    [key: string]: string;
}

function inquirerValidateFilePath(filePath: string): string | boolean {
    if(!fs.existsSync(filePath)) {
        return `File path doesn't exist: ${filePath}`;
    }
    return true;
}

function ensureConfigDirExists(): void {
    if(!fs.existsSync(HANDEL_CODEPIPELINE_DIR)) {
        fs.mkdirSync(HANDEL_CODEPIPELINE_DIR);
    }
}

function getConfigParam(paramName: string): string | null {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        const handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG) as ConfigParamCache;
        if(handelCodePipelineConfig[paramName]) {
            return handelCodePipelineConfig[paramName];
        }
    }
    return null;
}

function cacheConfigParam(paramName: string, paramValue: string) {
    if(fs.existsSync(HANDEL_CODEPIPELINE_CONFIG)) {
        const handelCodePipelineConfig = util.loadYamlFile(HANDEL_CODEPIPELINE_CONFIG) as ConfigParamCache;
        handelCodePipelineConfig[paramName] = paramValue;
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
    else {
        const handelCodePipelineConfig: ConfigParamCache = {};
        handelCodePipelineConfig[paramName] = paramValue;
        util.saveYamlFile(HANDEL_CODEPIPELINE_CONFIG, handelCodePipelineConfig);
    }
}

function askAccountConfigsQuestionIfNeeded(configs: PhaseSecrets, questions: inquirer.Question[]) {
    const accountConfigsPath = getConfigParam('account_configs_path');
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
}

export async function getPipelineConfigForDelete(argv: ParsedArgs): Promise<PhaseSecrets> {
    const secrets: PhaseSecrets = {};

    const questions: inquirer.Question[] = [
        {
            type: 'input',
            name: 'pipelineToDelete',
            message: 'Please enter the name of the pipeline from your handel-codepipeline.yml file that you would like to delete',
        },
        {
            type: 'input',
            name: 'accountName',
            message: 'Please enter the name of the account for the pipeline you wish to delete',
        }
    ];

    if(argv.pipeline && argv.account_name) {
        if(!fs.existsSync(HANDEL_CODEPIPELINE_DIR)) {
            throw new Error('Handel-CodePipeline config directory must exist when deploying with CLI params');
        }
        const accountConfigsPath = getConfigParam('account_configs_path');
        if(accountConfigsPath) {
            secrets.accountConfigsPath = accountConfigsPath;
        } else {
            throw new Error('account_configs_path not found in Handel-CodePipeline config directory');
        }
        secrets.pipelineToDelete = argv.pipeline;
        secrets.accountName = argv.account_name;
    } else {
        ensureConfigDirExists();

        askAccountConfigsQuestionIfNeeded(secrets, questions);

        const answers = await inquirer.prompt(questions);
        if(answers.accountConfigsPath) {
            secrets.accountConfigsPath = answers.accountConfigsPath;
            cacheConfigParam('account_configs_path', answers.accountConfigsPath);
        }
        secrets.pipelineToDelete = answers.pipelineToDelete;
        secrets.accountName = answers.accountName;
    }
    return secrets;
}

export async function getPipelineConfigForDeploy(argv: ParsedArgs): Promise<PhaseSecrets> {
    const secrets: PhaseSecrets = {};

    const questions: inquirer.Question[] = [
        {
            type: 'input',
            name: 'pipelineToDeploy',
            message: 'Please enter the name of the pipeline from your handel-codepipeline.yml file that you would like to deploy',
        },
        {
            type: 'input',
            name: 'accountName',
            message: 'Please enter the name of the account where your pipeline will be deployed',
        }
    ];

    // Get account configs
    if(argv.pipeline && argv.account_name && argv.secrets) {
        if(!fs.existsSync(HANDEL_CODEPIPELINE_DIR)) {
            throw new Error('Handel-CodePipeline config directory must exist when deploying with CLI params');
        }
        const accountConfigsPath = getConfigParam('account_configs_path');
        if(accountConfigsPath) {
            secrets.accountConfigsPath = accountConfigsPath;
        } else {
            throw new Error('account_configs_path not found in Handel-CodePipeline config directory');
        }
        secrets.pipelineToDeploy = argv.pipeline;
        secrets.accountName = argv.account_name;
    } else {
        ensureConfigDirExists();

        // Get account configs
        askAccountConfigsQuestionIfNeeded(secrets, questions);

        const answers = await inquirer.prompt(questions);
        if(answers.accountConfigsPath) {
            secrets.accountConfigsPath = answers.accountConfigsPath;
            cacheConfigParam('account_configs_path', answers.accountConfigsPath);
        }
        secrets.pipelineToDeploy = answers.pipelineToDeploy;
        secrets.accountName = answers.accountName;
    }
    return secrets;
}
