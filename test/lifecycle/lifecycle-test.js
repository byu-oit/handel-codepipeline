const expect = require('chai').expect;
const lifecycle = require('../../lib/lifecycle');
const codepipelineCalls = require('../../lib/aws/codepipeline-calls');
const sinon = require('sinon');
const util = require('../../lib/util/util');

describe('lifecycle module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('checkPhases', function () {
        it('should execute check on each phase', function () {
            let handelCodePipelineFile = {
                version: 1,
                pipelines: {
                    prd: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Source'
                            }
                        ]
                    }
                }
            }

            let error = 'SomeError'
            let phaseDeployers = {
                github: {
                    check: function (phaseConfig) {
                        return [error]
                    }
                }
            }

            let pipelineErrors = lifecycle.checkPhases(handelCodePipelineFile, phaseDeployers);
            expect(pipelineErrors.prd.length).to.equal(1);
            expect(pipelineErrors.prd[0]).to.equal(error);
        });
    });

    describe('validatePipelineSpec', function () {
        it('should require the name field', function () {
            let handelCodePipelineFile = {
                version: 1,

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Source'
                            },
                            {
                                type: 'codebuild',
                                name: 'Build'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("'name' field is required");
        })

        it('should return an error if no pipelines are specified', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {}
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("You must specify at least one or more pipelines");
        });

        it('should return an error if no phases are specified in a pipeline', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {}
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("You must specify at least one or more phases");
        });

        it('should return an error if there are fewer than 2 phases in the pipeline', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: []
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("You must specify at least two phases");
        });

        it('should return an error if the first phase is not a github phase', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'codebuild',
                                name: 'Build'
                            },
                            {
                                type: 'codebuild',
                                name: 'Build'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("must be a github phase");
        });

        it('should return an error if the second phase is not a codebuild phase', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Build'
                            },
                            {
                                type: 'github',
                                name: 'Build'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("must be a codebuild phase");
        });

        it('should return an error if any phase does not have a type field', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Build'
                            },
                            {
                                type: 'codebuild',
                                name: 'Build'
                            },
                            {
                                name: 'other'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("must specify a type");
        });

        it('should return an error if any phase does not have a name field', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Build'
                            },
                            {
                                type: 'codebuild'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain("must specify a name");
        });

        it('should work if there are no errors', function () {
            let handelCodePipelineFile = {
                version: 1,
                name: 'my-pipeline',

                pipelines: {
                    dev: {
                        phases: [
                            {
                                type: 'github',
                                name: 'Source'
                            },
                            {
                                type: 'codebuild',
                                name: 'Build'
                            }
                        ]
                    }
                }
            }

            let errors = lifecycle.validatePipelineSpec(handelCodePipelineFile);
            expect(errors.length).to.equal(0);
        });
    })

    describe('getPhaseSecrets', function () {
        it('should prompt for secrets from each phase', function () {
            let phaseDeployers = {
                github: {
                    getSecretsForPhase: function () {
                        return Promise.resolve({ githubSecret: 'mysecret' });
                    }
                },
                codebuild: {
                    getSecretsForPhase: function () {
                        return Promise.resolve({ codeBuildSecret: 'mysecret' });
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

    describe('createPhases', function () {
        it('should create each phase in the pipeline', function () {
            let phaseDeployers = {
                github: {
                    createPhase: function () {
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
            let pipelineToCreate = 'dev';
            let accountConfig = {};
            let phaseSecrets = {};

            return lifecycle.createPhases(phaseDeployers, handelCodePipelineFile, pipelineToCreate, accountConfig, phaseSecrets)
                .then(phases => {
                    expect(phases.length).to.equal(2);
                    expect(phases[0]).to.deep.equal({});
                    expect(phases[1]).to.deep.equal({});
                });
        });
    });

    describe('createPipeline', function () {
        let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
        let pipelineToCreate = 'dev';
        let accountConfig = {};
        let pipelinePhases = [];

        it('should create the pipeline', function () {
            let getPipelineStub = sandbox.stub(codepipelineCalls, 'getPipeline').returns(Promise.resolve(null));
            let createPipelineStub = sandbox.stub(codepipelineCalls, 'createPipeline').returns(Promise.resolve({}));

            return lifecycle.createPipeline(handelCodePipelineFile, pipelineToCreate, accountConfig, pipelinePhases, "FakeBucket")
                .then(pipeline => {
                    expect(pipeline).to.deep.equal({});
                    expect(getPipelineStub.calledOnce).to.be.true;
                    expect(createPipelineStub.calledOnce).to.be.true;
                });
        });

        it('should update the pipeline when it already exists', function () {
            let getPipelineStub = sandbox.stub(codepipelineCalls, 'getPipeline').returns(Promise.resolve({}));
            let updatePipelineStub = sandbox.stub(codepipelineCalls, 'updatePipeline').returns(Promise.resolve({}));

            return lifecycle.createPipeline(handelCodePipelineFile, pipelineToCreate, accountConfig, pipelinePhases, "FakeBucket")
                .then(pipeline => {
                    expect(pipeline).to.deep.equal({});
                    expect(getPipelineStub.calledOnce).to.be.true;
                    expect(updatePipelineStub.calledOnce).to.be.true;
                });
        });
    });

    describe('deletePhases', function () {
        it('should delete each phase in the pipeline', function () {
            let phaseDeployers = {
                github: {
                    deletePhase: function () {
                        return Promise.resolve({});
                    }
                },
                codebuild: {
                    deletePhase: function () {
                        return Promise.resolve({});
                    }
                }
            }
            let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let pipelineToDelete = 'dev';
            let accountConfig = {};

            return lifecycle.deletePhases(phaseDeployers, handelCodePipelineFile, pipelineToDelete, accountConfig, "FakeBucket")
                .then(results => {
                    expect(results.length).to.equal(2);
                    expect(results[0]).to.deep.equal({});
                    expect(results[1]).to.deep.equal({});
                });
        })
    });

    describe('deletePipeline', function () {
        it('should delete the pipeline', function () {
            let deletePipelineStub = sandbox.stub(codepipelineCalls, 'deletePipeline').returns(Promise.resolve({}));
            return lifecycle.deletePipeline("FakeName")
                .then(result => {
                    expect(result).to.deep.equal({});
                    expect(deletePipelineStub.calledOnce).to.be.true;
                })
        });
    });
});