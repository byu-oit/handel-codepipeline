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
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as inquirer from 'inquirer';
import * as winston from 'winston';
import { PhaseConfig, PhaseContext, PhaseSecrets } from '../../datatypes/index';

export interface GithubConfig extends PhaseConfig {
    owner: string;
    repo: string;
    branch: string;
}

export function check(phaseConfig: GithubConfig): string[] {
    const errors = [];

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

export function getSecretsForPhase(phaseConfig: PhaseConfig): Promise<PhaseSecrets> {
    const questions = [
        {
            type: 'input',
            name: 'githubAccessToken',
            message: `'${phaseConfig.name}' phase - Please enter your GitHub access token`,
        }
    ];
    return inquirer.prompt(questions);
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
                    OAuthToken: phaseContext.secrets.githubAccessToken
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
