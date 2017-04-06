const codebuild = require('../../../lib/codebuild');
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');
const expect = require('chai').expect;
const yaml = require('js-yaml');
const fs = require('fs');
const codebuildCalls = require('../../../lib/aws/codebuild-calls');
const iamCalls = require('../../../lib/aws/iam-calls');

function loadYamlFile(filePath) {
    try {
        return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    }
    catch(e) {
        return null;
    }
}

describe('codebuild module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
        AWS.restore('CodePipeline');
    });

    describe('createCodeBuildProjects', function() {
        it('should create the build and deploy projects in accounts', function() {
            let accountId = '777777777777';
            let handelCodePipelineFile = loadYamlFile(`${__dirname}/handel-codepipeline-example.yml`);
            let handelFile = loadYamlFile(`${__dirname}/handel-example.yml`);
            let accountConfigs = {
                '777777777777': {}
            };
            let pipelinesToAccountsMapping = {
                dev: accountId
            };

            //Mock
            let fakeArn = "FakeArn";
            let createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').returns(Promise.resolve({}));
            let createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').returns(Promise.resolve({
                Arn: fakeArn
            }))
            let attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').returns(Promise.resolve({}));
            let getRoleStub = sandbox.stub(iamCalls, 'getRole').returns(Promise.resolve({
                Arn: fakeArn
            }))
            let createProjectStub = sandbox.stub(codebuildCalls, 'createProject').returns(Promise.resolve({}))

            return codebuild.createCodeBuildProjects(pipelinesToAccountsMapping, handelCodePipelineFile, handelFile, accountConfigs)
                .then(createdProjects => {
                    console.log(createdProjects);
                    expect(createdProjects[accountId]).to.deep.equal([{}, {}]);
                    expect(createRoleStub.calledTwice).to.be.true;
                    expect(createPolicyStub.calledTwice).to.be.true;
                    expect(attachPolicyStub.calledTwice).to.be.true;
                    expect(getRoleStub.calledTwice).to.be.true;
                    expect(createProjectStub.calledTwice).to.be.true;
                });
        });
    });
});