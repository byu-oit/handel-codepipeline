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
const ServiceContext = require('handel/lib/datatypes/service-context');
const EnvironmentContext = require('handel/lib/datatypes/environment-context');
const EnvironmentDeployResult = require('handel/lib/datatypes/environment-deploy-result');
const handelUtil = require('handel/lib/common/util');

const checkPhase = require('handel/lib/phases/check');

const preDeployPhase = require('handel/lib/phases/pre-deploy');
const bindPhase = require('handel/lib/phases/bind');
const deployPhase = require('handel/lib/phases/deploy');

const deployOrderCalc = require('handel/lib/deploy/deploy-order-calc');

const winston = require('winston');

function deployEnvironment(accountConfig, deployers, envContext) {
    let errors = checkPhase.checkServices(deployers, envContext);

    if (errors.length > 0) {
        return new EnvironmentDeployResult("failure", `Errors while checking deploy spec: \n${errors.join("\n")}`);
    }

    return preDeployPhase.preDeployServices(deployers, envContext)
        .then(preDeployResults => {
            let deployOrder = deployOrderCalc.getDeployOrder(envContext);
            return bindAndDeployServices(deployers, envContext, preDeployResults, deployOrder);
        })

}

function bindAndDeployServices(serviceDeployers, environmentContext, preDeployContexts, deployOrder) {
    let deployProcess = Promise.resolve();
    let bindContexts = {};
    let deployContexts = {};
    for (let currentLevel = 0; deployOrder[currentLevel]; currentLevel++) {
        deployProcess = deployProcess
            .then(() => bindPhase.bindServicesInLevel(serviceDeployers, environmentContext, preDeployContexts, deployOrder, currentLevel))
            .then(levelBindResults => {
                for (let serviceName in levelBindResults) {
                    bindContexts[serviceName] = levelBindResults[serviceName]
                }
            })
            .then(() => deployPhase.deployServicesInLevel(serviceDeployers, environmentContext, preDeployContexts, deployContexts, deployOrder, currentLevel))
            .then(levelDeployResults => {
                for (let serviceName in levelDeployResults) {
                    deployContexts[serviceName] = levelDeployResults[serviceName]
                }
                return {
                    bindContexts,
                    deployContexts
                }
            });
    }

    return deployProcess;
}

exports.checkResourceConfig = checkResourceConfig;

function checkResourceConfig(name, config) {
    let deployers = handelUtil.getServiceDeployers();

    let type = config.type;

    let context = new ServiceContext('check', 'check', name, type, '1', config);

    let deployer = deployers[type];

    if (!deployer) {
        return [`service type '${type}' is not supported`];
    }

    return deployer.check(context);
};

exports.checkResources = function checkResources(resources) {
    let errors = [];
    for (let name of Object.getOwnPropertyNames(resources)) {
        let resErrors = checkResourceConfig(name, resources);
        errors = errors.concat(resErrors);
    }
    return errors;
};

exports.deployResources = function deployResources(resources, phaseContext, accountConfig) {
    return new Promise((resolve, reject) => {
        try {
            let deployers = handelUtil.getServiceDeployers();

            winston.info('Validating and parsing resources');


            let envContext = new EnvironmentContext(phaseContext.appName, '1', phaseContext.pipelineName);
            for (let name of Object.getOwnPropertyNames(resources)) {
                let serviceSpec = resources[name];

                if (!serviceSpec.tags) {
                    serviceSpec.tags = {}
                }

                serviceSpec.tags['handel-phase'] = phaseContext.phaseName;

                let serviceContext = new ServiceContext(phaseContext.appName, phaseContext.pipelineName, name,
                    serviceSpec.type, '1', serviceSpec);
                envContext.serviceContexts[name] = serviceContext;
            }

            resolve(deployEnvironment(accountConfig, deployers, envContext));
        } catch (err) {
            reject(err);
        }
    });
};


