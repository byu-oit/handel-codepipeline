const expect = require('chai').expect;
const lifecycle = require('../../lib/lifecycle');
const codepipelineCalls = require('../../lib/aws/codepipeline-calls');
const sinon = require('sinon');
const util = require('../../lib/util/util');

describe('lifecycle module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getPhaseSecrets', function() {
        it('should prompt for secrets from each phase', function() {
            let phaseDeployers = {
                github: {
                    getSecretsForPhase: function() {
                        return Promise.resolve({githubSecret: 'mysecret'});
                    }
                },
                codebuild: {
                    getSecretsForPhase: function () {
                        return Promise.resolve({codeBuildSecret: 'mysecret'});
                    }
                }
            }
            let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let pipelineToCreate = 'dev';

            return lifecycle.getPhaseSecrets(phaseDeployers, handelCodePipelineFile, pipelineToCreate)
                .then(results => {
                    expect(results.length).to.equal(2);
                    expect(results[0].githubSecret).to.equal('mysecret');
                    expect(results[1].codeBuildSecret).to.equal('mysecret');
                });
        });
    });

    describe('createPhases', function() {
        it('should create each phase in the pipeline', function() {
            let phaseDeployers = {
                github: {
                    createPhase: function() {
                        return Promise.resolve({});
                    }
                },
                codebuild: {
                    createPhase: function () {
                        return Promise.resolve({});
                    }
                }
            }
            let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let handelFile = util.loadYamlFile(`${__dirname}/handel-example.yml`);
            let pipelineToCreate = 'dev';
            let accountConfig = {};
            let phaseSecrets = {};

            return lifecycle.createPhases(phaseDeployers, handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, phaseSecrets)
                .then(phases => {
                    expect(phases.length).to.equal(2);
                    expect(phases[0]).to.deep.equal({});
                    expect(phases[1]).to.deep.equal({});
                });
        });
    });

    describe('createPipelines', function() {

        it('should create the pipeline', function() {
            let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let handelFile = util.loadYamlFile(`${__dirname}/handel-example.yml`);
            let pipelineToCreate = 'dev';
            let accountConfig = {};
            let pipelinePhases = [];

            let createPipelineStub = sandbox.stub(codepipelineCalls, 'createPipeline').returns(Promise.resolve({}));

            return lifecycle.createPipeline(handelCodePipelineFile, handelFile, pipelineToCreate, accountConfig, pipelinePhases)
                .then(pipeline => {
                    expect(pipeline).to.deep.equal({});
                    expect(createPipelineStub.calledOnce).to.be.true;
                });
        });
    });
});