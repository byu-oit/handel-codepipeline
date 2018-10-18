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
import {
    AccountConfig,
    ServiceContext,
    ServiceDeployer
} from 'handel-extension-api/dist/extension-api';
import handelUtil = require('handel/dist/common/util');
import {
    EnvironmentContext,
    EnvironmentDeleteResult,
    EnvironmentDeployResult,
    ServiceDeployers
} from 'handel/dist/datatypes';

import checkPhase = require('handel/dist/phases/check');

import bindPhase = require('handel/dist/phases/bind');
import deployPhase = require('handel/dist/phases/deploy');
import preDeployPhase = require('handel/dist/phases/pre-deploy');

import unBindPhase = require('handel/dist/phases/un-bind');
import unDeployPhase = require('handel/dist/phases/un-deploy');
import unPreDeployPhase = require('handel/dist/phases/un-pre-deploy');

import deployOrderCalc = require('handel/dist/deploy/deploy-order-calc');

import winston = require('winston');
import { PhaseConfig, PhaseContext } from '../../src/datatypes';
import { HandelExtraResources } from '../phases/codebuild';

const allowedHandelServices = ['apiaccess', 'dynamodb', 's3'];

export function check(resources: HandelExtraResources) {
    let errors: string[] = [];
    for (const name of Object.getOwnPropertyNames(resources)) {
        const resErrors = checkResource(name, resources[name]);
        errors = errors.concat(resErrors);
    }
    return errors;
}

export function deploy(resources: object, phaseContext: PhaseContext<PhaseConfig>, accountConfig: AccountConfig) {
    return new Promise((resolve, reject) => {
        try {
            const deployers = getServiceDeployers();

            winston.info('Validating and parsing resources');

            const envContext = createEnvironmentContext(resources, phaseContext, accountConfig);
            resolve(deployEnvironment(accountConfig, deployers, envContext));
        } catch (err) {
            reject(err);
        }
    });
}

export function deleteDeployedEnvironment(resources: object, phaseContext: PhaseContext<PhaseConfig>, accountConfig: AccountConfig) {
    return new Promise((resolve, reject) => {
        try {
            const deployers = getServiceDeployers();

            winston.info('Validating and parsing resources');

            const envContext = createEnvironmentContext(resources, phaseContext, accountConfig);
            resolve(deleteEnvironment(accountConfig, deployers, envContext));
        } catch (err) {
            reject(err);
        }
    });
}

function getServiceDeployers() {
    const all = handelUtil.getServiceDeployers();

    const result: any = [];

    for (const service of allowedHandelServices) {
        result[service] = all[service];
    }

    return result;
}

function checkResource(name: string, config: any) {
    const deployers = getServiceDeployers();

    const type = config.type;

    const context = new ServiceContext('check', 'check', name, type, config, {
        account_id: '111111111111',
        region: 'us-west-2',
        vpc: 'vpc-aaaaaaaa',
        public_subnets: [
            'subnet-ffffffff',
            'subnet-44444444'
        ],
        private_subnets: [
            'subnet-00000000',
            'subnet-77777777'
        ],
        data_subnets: [
            'subnet-eeeeeeee',
            'subnet-99999999'
        ],
        ecs_ami: 'ami-66666666',
        ssh_bastion_sg: 'sg-44444444',
        on_prem_cidr: '10.10.10.10/0',
        elasticache_subnet_group: 'aaaaaaaaaaa',
        rds_subnet_group: 'bbaabbaabbaa',
        redshift_subnet_group: 'cccccccccccccccccc'});

    const deployer = deployers[type];

    if (!deployer) {
        return [`service type '${type}' is not supported`];
    }

    return deployer.check(context);
}

function deployEnvironment(accountConfig: AccountConfig, deployers: ServiceDeployers, envContext: EnvironmentContext) {
    const errors = checkPhase.checkServices(deployers, envContext);

    if (errors.length > 0) {
        return new EnvironmentDeployResult('failure', `Errors while checking deploy spec: \n${errors.join('\n')}`);
    }

    return preDeployPhase.preDeployServices(deployers, envContext)
        .then((preDeployResults: any) => {
            const deployOrder = deployOrderCalc.getDeployOrder(envContext);
            return bindAndDeployServices(deployers, envContext, preDeployResults, deployOrder);
        }).then((result: any) => {
            let policies: any[] = [];
            const environmentVars = {};
            for (const name of Object.getOwnPropertyNames(result.deployContexts)) {
                const ctx = result.deployContexts[name];
                policies = policies.concat(ctx.policies);
                Object.assign(environmentVars, ctx.environmentVariables);
            }
            return {
                policies: policies,
                environmentVariables: environmentVars,
                deployContexts: result.deployContexts
            };
        });
}

function bindAndDeployServices(serviceDeployers: any, environmentContext: EnvironmentContext, preDeployContexts: import('/home/mxnguyen/projects/handel-codepipeline/node_modules/handel/src/datatypes/index').PreDeployContexts, deployOrder: string[][]) {
    let deployProcess: any = Promise.resolve(); // this returns a type of Promise<void>, which is ruining the rest of the function. I have put a type any until I can find a solution.
    const bindContexts: any = {};
    const deployContexts: any = {};
    for (let currentLevel = 0; deployOrder[currentLevel]; currentLevel++) {
        deployProcess = deployProcess
            .then(() => bindPhase.bindServicesInLevel(serviceDeployers, environmentContext, preDeployContexts, deployOrder, currentLevel))
            .then((levelBindResults: any) => {
                for (const serviceName in levelBindResults) {
                    if (serviceName) {
                        bindContexts[serviceName] = levelBindResults[serviceName];
                    }
                }
            })
            .then(() => deployPhase.deployServicesInLevel(serviceDeployers, environmentContext, preDeployContexts, deployContexts, deployOrder, currentLevel))
            .then((levelDeployResults: any) => {
                for (const serviceName in levelDeployResults) {
                    if (serviceName) {
                        deployContexts[serviceName] = levelDeployResults[serviceName];
                    }
                }
                return {
                    bindContexts,
                    deployContexts
                };
            });
    }

    return deployProcess;
}

function createEnvironmentContext(resources: any, phaseContext: PhaseContext<PhaseConfig>, accountConfig: AccountConfig) {
    const app = phaseContext.appName;
    const pipeline = phaseContext.pipelineName;

    const envContext = new EnvironmentContext(app, pipeline, accountConfig);
    for (const name of Object.getOwnPropertyNames(resources)) {
        const serviceSpec = resources[name];

        if (!serviceSpec.tags) {
            serviceSpec.tags = {};
        }

        serviceSpec.tags['handel-phase'] = phaseContext.phaseName;

        envContext.serviceContexts[name] = new ServiceContext(app, pipeline, name, serviceSpec.type, serviceSpec, accountConfig);
    }
    return envContext;
}

function unDeployAndUnBindServices(serviceDeployers: any, environmentContext: any, deployOrder: string[][]) {
    let deleteProcess: any = Promise.resolve(); // this returns type void, which ruins the rest of the function according to type script. I have assigned type any for now, until I can find a better solution.
    const unBindContexts: any = {};
    const unDeployContexts: any = {};
    for (let currentLevel = deployOrder.length - 1; deployOrder[currentLevel]; currentLevel--) {
        deleteProcess = deleteProcess
            .then(() => unDeployPhase.unDeployServicesInLevel(serviceDeployers, environmentContext, deployOrder, currentLevel))
            .then((levelUnDeployResults: any) => {
                for (const serviceName in levelUnDeployResults) {
                    if (serviceName) {
                        unDeployContexts[serviceName] = levelUnDeployResults[serviceName];
                    }
                }
            })
            .then(() => unBindPhase.unBindServicesInLevel(serviceDeployers, environmentContext, deployOrder, currentLevel))
            .then((levelUnBindResults: any) => {
                for (const serviceName in levelUnBindResults) {
                    if (serviceName) {
                        unBindContexts[serviceName] = levelUnBindResults[serviceName];
                    }
                }
                return {
                    unBindContexts,
                    unDeployContexts
                };
            });
    }

    return deleteProcess;
}

function deleteEnvironment(accountConfig: AccountConfig, serviceDeployers: ServiceDeployers, environmentContext: EnvironmentContext) {
    if (!accountConfig || !environmentContext) {
        return Promise.resolve(new EnvironmentDeleteResult('failure', 'Invalid configuration'));
    }
    else {
        winston.info(`Starting delete for environment ${environmentContext.environmentName}`);

        const deployOrder = deployOrderCalc.getDeployOrder(environmentContext);
        return unDeployAndUnBindServices(serviceDeployers, environmentContext, deployOrder)
            .then((unDeployAndUnBindResults: any) => {
                return unPreDeployPhase.unPreDeployServices(serviceDeployers, environmentContext);
            })
            .then((unPreDeployResults: string) => {
                return new EnvironmentDeleteResult('success', `Delete environment: ${unPreDeployResults}`);
            })
            .catch((err: Error) => {
                return new EnvironmentDeleteResult('failure', err.message, err);
            });
    }
}
