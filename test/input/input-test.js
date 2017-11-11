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
const input = require('../../dist/input');
const util = require('../../dist/common/util');
const sinon = require('sinon');
const fs = require('fs');
const inquirer = require('inquirer');

describe('input module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('getPipelineConfigForDelete', function() {
        it('should ask questions required for the delete action', function() {
            let accountConfigsPath = "FakePath";
            let pipelineName = "FakePipeline";
            let accountName = "FakeAccount";

            let existsStub = sandbox.stub(fs, 'existsSync').returns(false);
            let mkdirStub = sandbox.stub(fs, 'mkdirSync').returns(true);
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
                accountConfigsPath: accountConfigsPath,
                pipelineToDelete: pipelineName,
                accountName: accountName
            }));
            let saveYamlFileStub = sandbox.stub(util, 'saveYamlFile').returns(true);

            return input.getPipelineConfigForDelete()
                .then(config => {
                    expect(config.accountConfigsPath).to.equal(accountConfigsPath);
                    expect(config.pipelineToDelete).to.equal(pipelineName);
                    expect(accountName).to.equal(accountName);
                    expect(existsStub.callCount).to.equal(3);
                    expect(mkdirStub.callCount).to.equal(1);
                    expect(promptStub.callCount).to.equal(1);
                    expect(saveYamlFileStub.callCount).to.equal(1);
                });
        });
    });

    describe('getPipelineConfigForDeploy', function() {
        it('should ask questions required for the deploy action', function() {
            let accountConfigsPath = "FakePath";
            let pipelineName = "FakePipeline";
            let accountName = "FakeAccount";

            let existsStub = sandbox.stub(fs, 'existsSync').returns(false);
            let mkdirStub = sandbox.stub(fs, 'mkdirSync').returns(true);
            let promptStub = sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
                accountConfigsPath: accountConfigsPath,
                pipelineToDeploy: pipelineName,
                accountName: accountName
            }));
            let saveYamlFileStub = sandbox.stub(util, 'saveYamlFile').returns(true);

            return input.getPipelineConfigForDeploy()
                .then(config => {
                    expect(config.accountConfigsPath).to.equal(accountConfigsPath);
                    expect(config.pipelineToDeploy).to.equal(pipelineName);
                    expect(accountName).to.equal(accountName);
                    expect(existsStub.callCount).to.equal(3);
                    expect(mkdirStub.callCount).to.equal(1);
                    expect(promptStub.callCount).to.equal(1);
                    expect(saveYamlFileStub.callCount).to.equal(1);
                });
        });
    });
});