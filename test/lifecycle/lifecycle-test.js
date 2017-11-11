/*
 * Copyright 2017 Brigham Young University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const expect = require('chai').expect;
const lifecycle = require('../../dist/lifecycle');
const codepipelineCalls = require('../../dist/aws/codepipeline-calls');
const sinon = require('sinon');
const util = require('../../dist/common/util');

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

        it('should return an error if the first phase is not a github or codecommit phase', function () {
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
            expect(errors[0]).to.contain("must be a 'github' or 'codecommit' phase");
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
            let pipelineToDeploy = 'dev';

            return lifecycle.getPhaseSecrets(phaseDeployers, handelCodePipelineFile, pipelineToDeploy)
                .then(results => {
                    expect(results.length).to.equal(2);
                    expect(results[0].githubSecret).to.equal('mysecret');
                    expect(results[1].codeBuildSecret).to.equal('mysecret');
                });
        });
    });

    describe('deployPhases', function () {
        it('should deploy each phase in the pipeline', function () {
            let phaseDeployers = {
                github: {
                    deployPhase: function () {
                        return Promise.resolve({});
                    }
                },
                codebuild: {
                    deployPhase: function () {
                        return Promise.resolve({});
                    }
                }
            }
            let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let pipelineToDeploy = 'dev';
            let accountConfig = {};
            let phaseSecrets = {};

            return lifecycle.deployPhases(phaseDeployers, handelCodePipelineFile, pipelineToDeploy, accountConfig, phaseSecrets)
                .then(phases => {
                    expect(phases.length).to.equal(2);
                    expect(phases[0]).to.deep.equal({});
                    expect(phases[1]).to.deep.equal({});
                });
        });
    });

    describe('deployPipeline', function () {
        let handelCodePipelineFile = util.loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
        let pipelineToDeploy = 'dev';
        let accountConfig = {};
        let pipelinePhases = [];

        it('should create the pipeline', function () {
            let getPipelineStub = sandbox.stub(codepipelineCalls, 'getPipeline').returns(Promise.resolve(null));
            let createPipelineStub = sandbox.stub(codepipelineCalls, 'createPipeline').returns(Promise.resolve({}));

            return lifecycle.deployPipeline(handelCodePipelineFile, pipelineToDeploy, accountConfig, pipelinePhases, "FakeBucket")
                .then(pipeline => {
                    expect(pipeline).to.deep.equal({});
                    expect(getPipelineStub.callCount).to.equal(1);
                    expect(createPipelineStub.callCount).to.equal(1);
                });
        });

        it('should update the pipeline when it already exists', function () {
            let getPipelineStub = sandbox.stub(codepipelineCalls, 'getPipeline').returns(Promise.resolve({}));
            let updatePipelineStub = sandbox.stub(codepipelineCalls, 'updatePipeline').returns(Promise.resolve({}));

            return lifecycle.deployPipeline(handelCodePipelineFile, pipelineToDeploy, accountConfig, pipelinePhases, "FakeBucket")
                .then(pipeline => {
                    expect(pipeline).to.deep.equal({});
                    expect(getPipelineStub.callCount).to.equal(1);
                    expect(updatePipelineStub.callCount).to.equal(1);
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
            return lifecycle.deletePipeline("FakeApp", "FakePipeline")
                .then(result => {
                    expect(result).to.deep.equal({});
                    expect(deletePipelineStub.callCount).to.equal(1);
                })
        });
    });
});