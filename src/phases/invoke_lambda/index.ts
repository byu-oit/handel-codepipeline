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
import { PhaseConfig, PhaseContext, PhaseSecrets } from '../../datatypes/index';

export interface InvokeLambdaConfig extends PhaseConfig {
    function_name: string;
    function_parameters?: LambdaFunctionParameters;
}

export interface LambdaFunctionParameters {
    [key: string]: string;
}

function getInvokeLambdaPhaseSpec(phaseContext: PhaseContext<InvokeLambdaConfig>): AWS.CodePipeline.StageDeclaration {
    const phaseConfig: AWS.CodePipeline.StageDeclaration = {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: 'Invoke',
                    owner: 'AWS',
                    version: '1',
                    provider: 'Lambda'
                },
                configuration: {
                    FunctionName: phaseContext.params.function_name
                },
                runOrder: 1
            }
        ]
    };

    if(phaseContext.params.function_parameters) {
        phaseConfig.actions[0].configuration!.UserParameters = JSON.stringify(phaseContext.params.function_parameters);
    }

    return phaseConfig;
}

export function check(phaseConfig: InvokeLambdaConfig): string[] {
    const errors = [];

    if(!phaseConfig.function_name) {
        errors.push(`Invoke Lambda - The 'function_name' parameter is required`);
    }

    return errors;
}

export function getSecretsForPhase(phaseConfig: InvokeLambdaConfig): Promise<PhaseSecrets> {
    return Promise.resolve({});
}

export function deployPhase(phaseContext: PhaseContext<InvokeLambdaConfig>, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    winston.info(`Creating Invoke Lambda phase '${phaseContext.phaseName}'`);

    return new Promise((resolve, reject) => {
        resolve(getInvokeLambdaPhaseSpec(phaseContext));
    });
}

export function deletePhase(phaseContext: PhaseContext<InvokeLambdaConfig>, accountConfig: AccountConfig): Promise<boolean> {
    winston.info(`Nothing to delete for Invoke Lambda phase '${phaseContext.phaseName}'`);
    return Promise.resolve(true); // Nothing to delete
}
