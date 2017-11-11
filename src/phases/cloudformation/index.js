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

function getCloudFormationPhaseSpec(phaseContext, accountConfig) {
    var spec = {
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
                    category: "Deploy",
                    owner: "AWS",
                    version: "1",
                    provider: "CloudFormation"
                },
                configuration: {
                    StackName: `${phaseContext.appName}-${phaseContext.pipelineName}-${phaseContext.phaseName}`,
                    ActionMode: "CREATE_UPDATE",
                    Capabilities: "CAPABILITY_NAMED_IAM",
                    RoleArn: `arn:aws:iam::${accountConfig.account_id}:role/${phaseContext.params.deploy_role}`, 
                    TemplatePath: `Output_Build::${phaseContext.params.template_path}`
                }
            }
        ],
        
    };
    
    if (phaseContext.params.template_parameters_path) {
        spec.actions[0].configuration.TemplateConfiguration = `Output_Build::${phaseContext.params.template_parameters_path}`
    }
    
    return spec;
}

exports.check = function(phaseConfig) {
    let errors = [];
    
    if (!phaseConfig.deploy_role) {
        errors.push("Cloudformation - The `deploy_role` parameter is required");
    }    
    if (!phaseConfig.template_path) {
        errors.push("Cloudformation - The `template_path` parameter is required");
    }    

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.deployPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating CloudFormation phase '${phaseContext.phaseName}'`);

    return Promise.resolve(getCloudFormationPhaseSpec(phaseContext, accountConfig));
}

exports.deletePhase = function(phaseContext, accountConfig) {
    winston.info(`Nothing to delete for CloudFormation phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}