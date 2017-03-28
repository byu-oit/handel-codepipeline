const codeBuildCalls = require('../../../lib/aws/codebuild-calls');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const expect = require('chai').expect;

describe('codebuild calls module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
        AWS.restore('CodeBuild');
    });

    describe('createProject', function() {
        it('should create the project', function() {
            let projectName = "FakeProject";

            AWS.mock('CodeBuild', 'createProject', Promise.resolve({
                project: {
                    Name: projectName
                }
            }));

            return codeBuildCalls.createProject(projectName, projectName, "FakeImage", { SOME_KEY: "some_value" }, "777777777777", "FakeArn")
                .then(project => {
                    expect(project.Name).to.equal(projectName);
                });
        });
    });
});