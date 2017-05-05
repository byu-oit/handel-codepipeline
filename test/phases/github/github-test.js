const github = require('../../../lib/phases/github');
const expect = require('chai').expect;
const sinon = require('sinon');
const inquirer = require('inquirer');

describe('github phase module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getSecretsForPhase', function() {
        it('should prompt for a github access token', function() {
            let token = "FakeToken";
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({githubAccessToken: token}));

            return github.getSecretsForPhase()
                .then(results => {
                    expect(results.githubAccessToken).to.equal(token);
                });
        });
    });

    describe('createPhase', function() {
        it('should create the codebuild project and return the phase config', function() {
            let phaseContext = {
                phaseName: 'myphase',
                handelAppName: 'myApp',
                accountConfig: {
                    account_id: 111111111111
                },
                params: {},
                secrets: {}
            }

            return github.createPhase(phaseContext, {})
                .then(phase => {
                    expect(phase.name).to.equal(phaseContext.phaseName);
                });
        });
    });
});