const input = require('../../../create-pipeline/input');
const sinon = require('sinon');
const inquirer = require('inquirer');
const expect = require('chai').expect;

describe('input module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getAccountsForEnvs', function() {
        it('should prompt for input and return answers', function() {
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({}));
            return input.getAccountsForEnvs()
                .then(answers => {
                    expect(answers).to.deep.equal({});
                    expect(promptStub.calledOnce).to.be.true;
                });
        });
    });

    describe('getConfigForAccounts', function() {
        it('should prompt for account config for each account', function() {
            let accountId = 555555555555;
            let answersResponse = {};
            answersResponse[accountId] = `${__dirname}/account-config-example.yml`;
            let promptStub = sandbox.stub(inquirer, 'prompt');
            promptStub.returns(Promise.resolve(answersResponse));
            let environments = {
                prod: accountId
            }
            return input.getConfigForAccounts(environments)
                .then(answers => {
                    console.log(answers);
                    expect(answers[accountId]).to.not.be.undefined;
                    expect(answers[accountId].account_id).to.equal(accountId);
                    expect(promptStub.calledOnce).to.be.true;
                });
        });
    });
});