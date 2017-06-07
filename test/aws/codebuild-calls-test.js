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
const codeBuildCalls = require('../../lib/aws/codebuild-calls');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const expect = require('chai').expect;

describe('codebuild calls module', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
        AWS.restore('CodeBuild');
    });

    describe('createProject', function () {
        it('should create the project', function () {
            let projectName = "FakeProject";

            AWS.mock('CodeBuild', 'createProject', Promise.resolve({
                project: {
                    Name: projectName
                }
            }));

            return codeBuildCalls.createProject(projectName, projectName, "FakeImage", { SOME_KEY: "some_value" }, "777777777777", "FakeArn", "us-west-2")
                .then(project => {
                    expect(project.Name).to.equal(projectName);
                });
        });
    });

    describe('updateProject', function () {
        it('should update the project', function () {
            let projectName = "FakeProject";

            AWS.mock('CodeBuild', 'updateProject', Promise.resolve({
                project: {
                    Name: projectName
                }
            }));

            return codeBuildCalls.updateProject(projectName, projectName, "FakeImage", {}, "777777777777", "FakeArn", "us-west-2")
                .then(project => {
                    expect(project.Name).to.equal(projectName);
                })
        });
    });

    describe('getProject', function() {
        it('should return the project if it exists', function() {
            AWS.mock('CodeBuild', 'batchGetProjects', Promise.resolve({
                projects: [{}]
            }));

            return codeBuildCalls.getProject("FakeProject")
                .then(project => {
                    expect(project).to.deep.equal({});
                });
        });

        it('should return null if the project doesnt exist', function() {
            AWS.mock('CodeBuild', 'batchGetProjects', Promise.resolve({
                projects: []
            }));

            return codeBuildCalls.getProject("FakeProject")
                .then(project => {
                    expect(project).to.deep.equal(null);
                });
        });
    });

    describe('deleteProject', function() {
        it('should delete the project', function() {
            AWS.mock('CodeBuild', 'deleteProject', Promise.resolve(true));

            return codeBuildCalls.deleteProject("FakeProject")
                .then(success => {
                    expect(success).to.be.true;
                })
        });
    });
});