const codecommit = require('../../../lib/phases/codecommit');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('github phase module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('check', function () {
        it('should require the repo parameter', function() {
            let phaseConfig = {
                branch: 'FakeBranch'
            };
            let errors = codecommit.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'repo' parameter is required`);
        });

        it('should require the branch parameter', function() {
            let phaseConfig = {
                repo: 'FakeRepo'
            };
            let errors = codecommit.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.include(`The 'branch' parameter is required`);
        });

        it('should work when all required parameters are provided', function () {
            let phaseConfig = {
                repo: 'FakeRepo',
                branch: 'FakeBranch'
            };
            let errors = codecommit.check(phaseConfig);
            expect(errors.length).to.equal(0);
        });
    });

    describe('getSecretsForPhase', function () {
        it('should return an empty object', function () {
            return codecommit.getSecretsForPhase()
                .then(results => {
                    expect(results).to.deep.equal({});
                });
        });
    });

    describe('createPhase', function () {
        it('should create the codebuild project and return the phase config', function () {
            let phaseContext = {
                phaseName: 'myphase',
                appName: 'myApp',
                accountConfig: {
                    account_id: 111111111111
                },
                params: {},
                secrets: {}
            }

            return codecommit.createPhase(phaseContext, {})
                .then(phase => {
                    expect(phase.name).to.equal(phaseContext.phaseName);
                });
        });
    });

    describe('deletePhase', function () {
        it('should do nothing', function () {
            return codecommit.deletePhase({}, {})
                .then(result => {
                    expect(result).to.deep.equal({});
                })
        });
    });
});