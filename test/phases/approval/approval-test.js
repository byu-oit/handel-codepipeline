const expect = require('chai').expect;
const approval = require('../../../lib/phases/approval');
const sinon = require('sinon');
const inquirer = require('inquirer');

describe('approval module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getSecretsForPhase', function() {
        it('should not prompt for any secrets', function() {
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({}));

            return approval.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                    expect(promptStub.notCalled).to.be.true;
                });
        });
    });

    describe('createPhase', function() {
        let phaseContext = {
            phaseName: 'MyPhase',
            params: {},
            secrets: {}
        }
        let accountConfig = {
            account_id: '111111111111',
            region: 'us-west-2'
        }

        it('should return the configuration for the phase', function() {
            return approval.createPhase(phaseContext, accountConfig)
                .then(phaseSpec => {
                    expect(phaseSpec.name).to.equal(phaseContext.phaseName);
                }); 
        });
    });

});