const github = require('../../../lib/phases/github');
const expect = require('chai').expect;
const sinon = require('sinon');
const inquirer = require('inquirer');

describe('github phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the owner parameter', function () {
            let phaseConfig = {
                repo: 'FakeRepo',
                branch: 'FakeBranch'
            };
            let errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'owner' parameter is required`);
        });

        it('should require the repo parameter', function() {
            let phaseConfig = {
                owner: 'FakeOwner',
                branch: 'FakeBranch'
            };
            let errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'repo' parameter is required`);
        });

        it('should require the branch parameter', function() {
            let phaseConfig = {
                owner: 'FakeOwner',
                repo: 'FakeRepo'
            };
            let errors = github.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'branch' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                owner: 'FakeOwner',
                repo: 'FakeRepo',
                branch: 'FakeBranch'
            };
            let errors = github.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should prompt for a github access token', function () {
            let token = "FakeToken";
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({ githubAccessToken: token }));

            return github.getSecretsForPhase()
                .then(results => {
                    expect(results.githubAccessToken).to.equal(token);
                });
        });
    });

    describe('createPhase', function () {
        it('should create the codebuild project and return the phase config', function () {
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

    describe('deletePhase', function () {
        it('should do nothing', function () {
            return github.deletePhase({}, {})
                .then(result => {
                    expect(result).to.deep.equal({});
                })
        });
    });
});