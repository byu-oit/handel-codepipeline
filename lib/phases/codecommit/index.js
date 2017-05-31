const winston = require('winston');

exports.check = function (phaseConfig) {
    let errors = [];

    if (!phaseConfig.repo) {
        errors.push(`GitHub - The 'repo' parameter is required`);
    }
    if (!phaseConfig.branch) {
        errors.push(`GitHub - The 'branch' parameter is required`);
    }

    return errors;
}

exports.getSecretsForPhase = function () {
    return Promise.resolve({});
}

exports.createPhase = function (phaseContext, accountConfig) {
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
                    owner: "AWS",
                    version: "1",
                    provider: "CodeCommit"
                },
                outputArtifacts: [
                    {
                        name: `Output_Source`
                    }
                ],
                configuration: {
                    RepositoryName: phaseContext.params.repo,
                    BranchName: branch
                },
                runOrder: 1
            }
        ]
    });
}

exports.deletePhase = function (phaseContext, accountConfig) {
    winston.info(`Nothing to delete for source phase '${phaseContext.phaseName}'`);
    return Promise.resolve({}); //Nothing to delete
}