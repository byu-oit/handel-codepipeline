const yaml = require('js-yaml');
const fs = require('fs');
const sinon = require('sinon');
const codepipeline = require('../../../lib/codepipeline');
const s3Calls = require('../../../lib/aws/s3-calls');
const expect = require('chai').expect;
const AWS = require('aws-sdk-mock');

function loadYamlFile(filePath) {
    try {
        return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    }
    catch(e) {
        return null;
    }
}

describe('codepipeline module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
        AWS.restore('CodePipeline');
    });
    
    describe('createPipelines', function() {
        it('should create pipelines from the provided spec files', function() {
            let accountId = '777777777777';
            let handelCodePipelineFile = loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let handelFile = loadYamlFile(`${__dirname}/handel-example.yml`);
            let accountConfigs = {
                '777777777777': {}
            };

            let createBucketStub = sandbox.stub(s3Calls, 'createBucketIfNotExists').returns(Promise.resolve({}))
            AWS.mock('CodePipeline', 'createPipeline', Promise.resolve({
                pipeline: {}
            }));

            return codepipeline.createPipelines(handelCodePipelineFile, handelFile, accountConfigs)
                .then(createdPipelines => {
                    expect(createBucketStub.calledOnce).to.be.true;
                    expect(createdPipelines[accountId]).to.deep.equal({});
                });
        });
    });
});