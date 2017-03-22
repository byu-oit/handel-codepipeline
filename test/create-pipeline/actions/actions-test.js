const actions = require('../../../create-pipeline/actions');
const AWS = require('aws-sdk-mock');
const expect = require('chai').expect;

describe('actions module', function() {
    describe('createHandelActions', function() {
        it('should create a Handel action in the accounts specified when one doesnt exist', function() {
            let dnsName = "SomeDnsName";
            let entityUrlTemplate = `http://${dnsName}/{Config:ProjectName}/`;
            AWS.mock('CodePipeline', 'listActionTypes', Promise.resolve({
                actionTypes: []
            }));
            AWS.mock('CodePipeline', 'createCustomActionType', Promise.resolve({
                settings: {
                    entityUrlTemplate: entityUrlTemplate
                }
            }));

            let accountId = "555555555555";
            let accountConfigs = {};
            accountConfigs[accountId] = {};

            let handelWorkerStacks = {};

            handelWorkerStacks[accountId] = {
                Outputs: [{
                    OutputValue: dnsName
                }]
            };
            return actions.createHandelActions(accountConfigs, handelWorkerStacks)
                .then(createdActions => {
                    expect(createdActions[accountId]).to.not.be.undefined;
                    expect(createdActions[accountId].settings.entityUrlTemplate).to.equal(entityUrlTemplate);
                    AWS.restore('CodePipeline');
                });
        });

        it('should just return the Handel action when it already exists', function() {
            let dnsName = "SomeDnsName";
            let entityUrlTemplate = `http://${dnsName}/{Config:ProjectName}/`;
            AWS.mock('CodePipeline', 'listActionTypes', Promise.resolve({
                actionTypes: [{
                    id: {
                        category: "Deploy",
                        provider: "Handel",
                        version: "1"
                    },
                    settings: {
                        entityUrlTemplate: entityUrlTemplate
                    }
                }]
            }));

            let accountId = "555555555555";
            let accountConfigs = {};
            accountConfigs[accountId] = {};

            let handelWorkerStacks = {};

            handelWorkerStacks[accountId] = {
                Outputs: [{
                    OutputValue: dnsName
                }]
            };
            return actions.createHandelActions(accountConfigs, handelWorkerStacks)
                .then(createdActions => {
                    expect(createdActions[accountId]).to.not.be.undefined;
                    expect(createdActions[accountId].settings.entityUrlTemplate).to.equal(entityUrlTemplate);
                    AWS.restore('CodePipeline');
                });
        });
    });
});