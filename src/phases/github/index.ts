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
import * as crypto from 'crypto';
import { AccountConfig } from 'handel/src/datatypes';
import * as inquirer from 'inquirer';
import { Question, Questions } from 'inquirer';
import * as winston from 'winston';
import * as codepipelineCalls from '../../aws/codepipeline-calls';
import { PhaseConfig, PhaseContext, PhaseSecretQuestion, PhaseSecrets } from '../../datatypes/index';

export interface GithubConfig extends PhaseConfig {
    owner: string;
    repo: string;
    branch: string;
}

export function check(phaseConfig: GithubConfig): string[] {
    const errors = [];

    if (!phaseConfig.owner) {
        errors.push(`GitHub - The 'owner' parameter is required`);
    }
    if (!phaseConfig.repo) {
        errors.push(`GitHub - The 'repo' parameter is required`);
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: PhaseConfig): Promise<PhaseSecrets> {
    return inquirer.prompt(getQuestions(phaseConfig));
}

function getQuestions(phaseConfig: PhaseConfig) {
    return [
        {
            type: 'input',
            name: 'githubAccessToken',
            message: `'${phaseConfig.name}' phase - Please enter your GitHub access token`,
        }
    ];
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    const questions = getQuestions(phaseConfig);
    const result: PhaseSecretQuestion[] = [];
    questions.forEach((question) => {
        result.push({
            phaseName: phaseConfig.name,
            name: question.name,
            message: question.message
        });
    });
    return result;
}

export function deployPhase(phaseContext: PhaseContext<GithubConfig>, accountConfig: AccountConfig) {
    winston.info(`Creating source phase '${phaseContext.phaseName}'`);
    const branch = phaseContext.params.branch || 'master';

    return Promise.resolve({
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: 'Source',
                    owner: 'ThirdParty',
                    version: '1',
                    provider: 'GitHub'
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
                    OAuthToken: phaseContext.secrets.githubAccessToken,
                    PollForSourceChanges: 'false'
                },
                runOrder: 1
            }
        ]
    });
}

export function deletePhase(phaseContext: PhaseContext<GithubConfig>, accountConfig: AccountConfig) {
    winston.info(`Nothing to delete for source phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); // Nothing to delete
}

export async function addWebhook(phaseContext: PhaseContext<GithubConfig>) {
    const appName = phaseContext.appName;
    const pipelineName = phaseContext.pipelineName;
    const phaseName = phaseContext.phaseName;
    const pipelineProjectName = codepipelineCalls.getPipelineProjectName(appName, pipelineName);
    const webhookName = codepipelineCalls.getPipelineWebhookName(appName, pipelineName);
    const webhookExists = await checkWebhookExists(webhookName);
    if (!webhookExists) {
        const webhookParam: AWS.CodePipeline.PutWebhookInput = {
            'webhook': {
                'name': webhookName,
                'targetPipeline': pipelineProjectName,
                'targetAction': phaseName,
                'filters': [
                    {
                        'jsonPath': '$.ref',
                        'matchEquals': 'refs/heads/{Branch}'
                    }
                ],
                'authentication': 'GITHUB_HMAC',
                'authenticationConfiguration': {
                    'SecretToken': crypto.randomBytes(32).toString('hex')
                }
            }
        };
        const webhook = await codepipelineCalls.putWebhook(webhookParam);
        const registerWebhook = await codepipelineCalls.registerWebhook(webhookName);
    }
}

export async function removeWebhook(phaseContext: PhaseContext<GithubConfig>) {
    const appName = phaseContext.appName;
    const pipelineName = phaseContext.pipelineName;
    const webhookName = codepipelineCalls.getPipelineWebhookName(appName, pipelineName);
    const webhookExists = await codepipelineCalls.webhookExists(webhookName);
    if(webhookExists) {
        const deregisterResult = await codepipelineCalls.deregisterWebhook(webhookName);
        const deleteWebhook = await codepipelineCalls.deleteWebhook(webhookName);
    }
}

async function checkWebhookExists(webhookName: string): Promise<boolean> {
    const webhooks = await codepipelineCalls.listWebhooks();
    if (!webhooks.webhooks) {
        return false;
    }
    for (const webhook of webhooks.webhooks) {
        if (webhook.definition.name === webhookName) {
            return true;
        }
    }
    return false;
}
