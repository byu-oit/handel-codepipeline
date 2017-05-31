const winston = require('winston');

function getApprovalPhaseSpec(phaseContext) {
    return {
        name: phaseContext.phaseName,
        actions: [
            {
                inputArtifacts: [],
                outputArtifacts: [],
                name: phaseContext.phaseName,
                actionTypeId: {
                    category: "Approval",
                    owner: "AWS",
                    version: "1",
                    provider: "Manual"
                },
                configuration: {},
                runOrder: 1
            }
        ]
    }
}

exports.check = function(phaseConfig) {
    let errors = [];
    
    //No required parameters

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.createPhase = function (phaseContext, accountConfig) {
    winston.info(`Creating manual approval phase '${phaseContext.phaseName}'`);

    return Promise.resolve(getApprovalPhaseSpec(phaseContext))
}

exports.deletePhase = function(phaseContext, accountConfig) {
    winston.info(`Nothing to delete for source phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}