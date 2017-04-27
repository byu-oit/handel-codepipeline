const input = require('../../../lib/input');
const sinon = require('sinon');
const inquirer = require('inquirer');
const expect = require('chai').expect;
const fs = require('fs');
const util = require('../../../lib/util/util');

describe('input module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getConfigFiles', function() {
        it('should prompt for config file paths for the application spec and the pipeline spec', function() {
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
                accountConfigsPath: 'FakePath',
                githubAccessToken: 'FakeToken'
            }));
            let fileExistsStub = sandbox.stub(fs, 'existsSync').returns(false);
            let loadYamlFileStub = sandbox.stub(util, 'loadYamlFile');
            loadYamlFileStub.onCall(0).returns({});
            loadYamlFileStub.onCall(1).returns({});
            loadYamlFileStub.onCall(2).returns({});
            loadYamlFileStub.onCall(3).returns({});
            let saveYamlFileStub = sandbox.stub(util, 'saveYamlFile');

            return input.getConfigFiles()
                .then(configs => {
                    expect(promptStub.calledOnce).to.be.true;
                    expect(fileExistsStub.callCount).to.equal(2);
                    expect(loadYamlFileStub.callCount).to.equal(2);
                    expect(saveYamlFileStub.callCount).to.equal(1);
                    expect(configs.handel).to.deep.equal({});
                    expect(configs.handelCodePipeline).to.deep.equal({});
                    expect(configs.accountConfigsPath).to.equal('FakePath');
                    expect(configs.githubAccessToken).to.equal('FakeToken');
                })
        });
    });

    describe('getAccountConfigs', function() {
        it('should attempt to load account config files for each account', function() {
            let accountId = 555555555555;
            let pipelinesToAccountsMapping = {
                dev: accountId
            };
            let accountConfigsPath = __dirname;

            let accountConfigs = input.getAccountConfigs(accountConfigsPath, pipelinesToAccountsMapping);
            expect(accountConfigs[accountId]).to.not.be.undefined;
            expect(accountConfigs[accountId].account_id).to.equal(accountId);
        });
    });
});