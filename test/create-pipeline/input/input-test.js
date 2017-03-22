const input = require('../../../create-pipeline/input');
const sinon = require('sinon');
const inquirer = require('inquirer');
const expect = require('chai').expect;
const fs = require('fs');
const util = require('../../../create-pipeline/util/util');

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
                handel: {},
                handelCodePipeline: {}
            }));
            let loadYamlFileStub = sandbox.stub(util, 'loadYamlFile').returns({})

            return input.getConfigFiles()
                .then(configs => {
                    expect(promptStub.calledOnce).to.be.true;
                    expect(loadYamlFileStub.calledTwice).to.be.true;
                    expect(configs.handel).to.deep.equal({});
                    expect(configs.handelCodePipeline).to.deep.equal({});
                })
        });
    });

    describe('getConfigForAccounts', function() {
        it('should attempt to load account config files for each account', function() {
            let accountId = 555555555555;
            let handelCodePipelineFile = {
                pipelines: {}
            }
            handelCodePipelineFile.pipelines[accountId] = {};

            let existsSyncStub = sandbox.stub(fs, 'existsSync').returns(true);
            let loadYamlFileStub = sandbox.stub(util, 'loadYamlFile').returns({});

            let accountConfigs = input.getAccountConfigs(handelCodePipelineFile);
            expect(existsSyncStub.calledOnce).to.be.true;
            expect(loadYamlFileStub.calledOnce).to.be.true;
            expect(accountConfigs[accountId]).to.not.be.undefined;
            expect(accountConfigs[accountId]).to.deep.equal({});
        });
    });
});