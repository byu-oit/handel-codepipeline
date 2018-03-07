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
import * as AWS from 'aws-sdk';
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as winston from 'winston';
import { PhaseConfig, PhaseContext, PhaseSecretQuestion } from '../../datatypes/index';

export interface CloudformationConfig extends PhaseConfig {
    template_path: string;
    deploy_role: string;
    template_parameters_path?: string;
}

function getCloudFormationPhaseSpec(phaseContext: PhaseContext<CloudformationConfig>, accountConfig: AccountConfig): AWS.CodePipeline.StageDeclaration {
    const spec: AWS.CodePipeline.StageDeclaration = {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [
                    {
                        name: `Output_Build`
                    }
                ],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: 'Deploy',
                    owner: 'AWS',
                    version: '1',
                    provider: 'CloudFormation'
                },
                configuration: {
                    StackName: `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`,
                    ActionMode: 'CREATE_UPDATE',
                    Capabilities: 'CAPABILITY_NAMED_IAM',
                    RoleArn: `arn:aws:iam::${accountConfig.account_id}:role/${phaseContext.params.deploy_role}`,
                    TemplatePath: `Output_Build::${phaseContext.params.template_path}`,
                }
            }
        ]
    };

    if (phaseContext.params.template_parameters_path) {
        spec.actions[0].configuration!.TemplateConfiguration = `Output_Build::${phaseContext.params.template_parameters_path}`;
    }

    return spec;
}

export function check(phaseConfig: CloudformationConfig) {
    const errors = [];

    if (!phaseConfig.deploy_role) {
        errors.push(`Cloudformation - The 'deploy_role' parameter is required`);
    }
    if (!phaseConfig.template_path) {
        errors.push(`Cloudformation - The 'template_path' parameter is required`);
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: CloudformationConfig) {
    return Promise.resolve({});
}

export function getSecretQuestions(phaseConfig: PhaseConfig): PhaseSecretQuestion[] {
    return [];
}

export function deployPhase(phaseContext: PhaseContext<CloudformationConfig>, accountConfig: AccountConfig) {
    winston.info(`Creating CloudFormation phase '${phaseContext.phaseName}'`);

    return Promise.resolve(getCloudFormationPhaseSpec(phaseContext, accountConfig));
}

export function deletePhase(phaseContext: PhaseContext<CloudformationConfig>, accountConfig: AccountConfig) {
    winston.info(`Nothing to delete for CloudFormation phase '${phaseContext.phaseName}'`);
    return Promise.resolve(true); // Nothing to delete
}
