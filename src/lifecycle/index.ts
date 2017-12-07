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
import * as async from 'async';
import * as AWS from 'aws-sdk';
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as codepipelineCalls from '../aws/codepipeline-calls';
import { HandelCodePipelineFile, PhaseConfig, PhaseContext, PhaseDeployer, PhaseDeployers, PhaseSecrets } from '../datatypes/index';

interface PipelineCheckErrors {
    [pipelineName: string]: string[];
}

function deployPhase(phaseContext: PhaseContext<PhaseConfig>, phaseDeployers: PhaseDeployers, accountConfig: AccountConfig): Promise<AWS.CodePipeline.StageDeclaration> {
    return Promise.resolve()
        .then(async () => {
            const phaseDeployer = phaseDeployers[phaseContext.phaseType];
            if (!phaseDeployer) {
                throw new Error(`Invalid or unsupported pipeline phase type ${phaseContext.phaseType}`);
            }
            else {
                return await phaseDeployer.deployPhase(phaseContext, accountConfig);
            }
        });
}

function getPhaseContext(handelCodePipelineFile: HandelCodePipelineFile,
    codePipelineBucketName: string,
    pipelineName: string,
    accountConfig: AccountConfig,
    phase: PhaseConfig,
    phaseSecrets: PhaseSecrets) {
    return {
        appName: handelCodePipelineFile.name,
        codePipelineBucketName: codePipelineBucketName,
        pipelineName: pipelineName,
        accountConfig: accountConfig,
        phaseType: phase.type,
        phaseName: phase.name,
        params: phase,
        secrets: phaseSecrets
    };
}

export function checkPhases(handelCodePipelineFile: HandelCodePipelineFile, phaseDeployers: PhaseDeployers): PipelineCheckErrors {
    const pipelineErrors: PipelineCheckErrors = {};

    for (const pipelineName in handelCodePipelineFile.pipelines) {
        if (handelCodePipelineFile.pipelines.hasOwnProperty(pipelineName)) {
            pipelineErrors[pipelineName] = [];
            const pipelineConfig = handelCodePipelineFile.pipelines[pipelineName];
            for (const phaseConfig of pipelineConfig.phases) {
                const phaseType = phaseConfig.type;
                const phaseDeployer = phaseDeployers[phaseType];
                if (!phaseDeployer) {
                    pipelineErrors[pipelineName] = [
                        `You specified an invalid phase type: '${phaseType}'`
                    ];
                }
                else {
                    const errors = phaseDeployer.check(phaseConfig);
                    pipelineErrors[pipelineName] = pipelineErrors[pipelineName].concat(errors);
                }
            }
        }
    }

    return pipelineErrors;
}

export function validatePipelineSpec(handelCodePipelineFile: HandelCodePipelineFile): string[] {
    const errors: string[] = [];

    if (!handelCodePipelineFile.name) {
        errors.push(`The top-level 'name' field is required`);
    }

    if (!handelCodePipelineFile.pipelines || Object.keys(handelCodePipelineFile.pipelines).length === 0) {
        errors.push(`You must specify at least one or more pipelines in the 'pipelines' field`);
    }
    else {
        for (const pipelineName in handelCodePipelineFile.pipelines) {
            if (handelCodePipelineFile.pipelines.hasOwnProperty(pipelineName)) {
                const pipelineDef = handelCodePipelineFile.pipelines[pipelineName];
                if (!pipelineDef.phases) {
                    errors.push(`You must specify at least one or more phases in your pipeline ${pipelineName}`);
                }
                else {
                    // Validate first phase is github
                    if (pipelineDef.phases.length < 2) {
                        errors.push(`You must specify at least two phases: github and codebuild`);
                    }
                    else {
                        if (pipelineDef.phases[0].type !== 'github' && pipelineDef.phases[0].type !== 'codecommit') {
                            errors.push(`The first phase in your pipeline ${pipelineName} must be a 'github' or 'codecommit' phase`);
                        }
                        if (pipelineDef.phases[1].type !== 'codebuild') {
                            errors.push(`The second phase in your application ${pipelineName} must be a codebuild phase`);
                        }
                    }

                    // Validate each phase has a type and name
                    for (const phaseSpec of pipelineDef.phases) {
                        if (!phaseSpec.type) {
                            errors.push(`You must specify a type for all the phases in your pipeline ${pipelineName}`);
                        }
                        if (!phaseSpec.name) {
                            errors.push(`You must specify a name for all the phases in your pipeline ${pipelineName}`);
                        }
                    }
                }
            }
        }
    }

    return errors;
}

export async function getPhaseSecrets(phaseDeployers: PhaseDeployers, handelCodePipelineFile: HandelCodePipelineFile, pipelineName: string) {
    const pipelineSecrets = [];

    for(const phaseSpec of handelCodePipelineFile.pipelines[pipelineName].phases) {
        const phaseType = phaseSpec.type;
        const phaseDeployer = phaseDeployers[phaseType];
        const phaseSecrets = await phaseDeployer.getSecretsForPhase(phaseSpec);
        pipelineSecrets.push(phaseSecrets);
    }

    return pipelineSecrets;
}

export function deployPhases(phaseDeployers: PhaseDeployers,
    handelCodePipelineFile: HandelCodePipelineFile,
    pipelineName: string,
    accountConfig: AccountConfig,
    phasesSecrets: PhaseSecrets[],
    codePipelineBucketName: string) {
    const deployPromises = [];

    const pipelinePhases = handelCodePipelineFile.pipelines[pipelineName].phases;
    for (let i = 0; i < pipelinePhases.length; i++) {
        const phase = pipelinePhases[i];

        const phaseContext = getPhaseContext(handelCodePipelineFile, codePipelineBucketName, pipelineName, accountConfig, phase, phasesSecrets[i]);

        deployPromises.push(deployPhase(phaseContext, phaseDeployers, accountConfig));
    }

    return Promise.all(deployPromises);
}

export async function deployPipeline(handelCodePipelineFile: HandelCodePipelineFile,
    pipelineName: string,
    accountConfig: AccountConfig,
    pipelinePhases: AWS.CodePipeline.StageDeclaration[],
    codePipelineBucketName: string) {
    const appName = handelCodePipelineFile.name;
    const pipelineProjectName = codepipelineCalls.getPipelineProjectName(appName, pipelineName);

    const pipeline = await codepipelineCalls.getPipeline(pipelineProjectName);
    if (!pipeline) {
        return codepipelineCalls.createPipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
    }
    else {
        return codepipelineCalls.updatePipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
    }
}

export function deletePhases(phaseDeployers: PhaseDeployers,
    handelCodePipelineFile: HandelCodePipelineFile,
    pipelineName: string,
    accountConfig: AccountConfig,
    codePipelineBucketName: string) {
    const deletePromises = [];

    const pipelinePhases = handelCodePipelineFile.pipelines[pipelineName].phases;
    for (const pipelinePhase of pipelinePhases) {
        const phaseType = pipelinePhase.type;
        const phaseDeloyer = phaseDeployers[phaseType];

        const phaseContext = getPhaseContext(handelCodePipelineFile, codePipelineBucketName, pipelineName, accountConfig, pipelinePhase, {}); // Don't need phase secrets for delete

        deletePromises.push(phaseDeloyer.deletePhase(phaseContext, accountConfig));
    }

    return Promise.all(deletePromises);
}

export function deletePipeline(appName: string, pipelineName: string) {
    return codepipelineCalls.deletePipeline(appName, pipelineName);
}
