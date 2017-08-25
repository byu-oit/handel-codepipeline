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

exports.deployPhase = function (phaseContext, accountConfig) {
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