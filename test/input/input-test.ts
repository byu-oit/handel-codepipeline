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

import { expect } from 'chai';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as sinon from 'sinon';
import * as util from '../../src/common/util';
import * as input from '../../src/input';

describe('input module', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('getPipelineConfigForDelete', () => {
        it('should ask questions required for the delete action', async () => {
            const accountConfigsPath = 'FakePath';
            const pipelineName = 'FakePipeline';
            const accountName = 'FakeAccount';

            const existsStub = sinon.stub(fs, 'existsSync').returns(false);
            const mkdirStub = sinon.stub(fs, 'mkdirSync').returns(true);
            const promptStub = sinon.stub(inquirer, 'prompt').resolves({
                accountConfigsPath: accountConfigsPath,
                pipelineToDelete: pipelineName,
                accountName: accountName
            });
            const saveYamlFileStub = sinon.stub(util, 'saveYamlFile').returns(true);

            const config = await input.getPipelineConfigForDelete({_: ['']});
            expect(config.accountConfigsPath).to.equal(accountConfigsPath);
            expect(config.pipelineToDelete).to.equal(pipelineName);
            expect(accountName).to.equal(accountName);
            expect(existsStub.callCount).to.equal(3);
            expect(mkdirStub.callCount).to.equal(1);
            expect(promptStub.callCount).to.equal(1);
            expect(saveYamlFileStub.callCount).to.equal(1);
        });
    });

    describe('getPipelineConfigForDeploy', () => {
        it('should ask questions required for the deploy action', async () => {
            const accountConfigsPath = 'FakePath';
            const pipelineName = 'FakePipeline';
            const accountName = 'FakeAccount';

            const existsStub = sinon.stub(fs, 'existsSync').returns(false);
            const mkdirStub = sinon.stub(fs, 'mkdirSync').returns(true);
            const promptStub = sinon.stub(inquirer, 'prompt').resolves({
                accountConfigsPath: accountConfigsPath,
                pipelineToDeploy: pipelineName,
                accountName: accountName
            });
            const saveYamlFileStub = sinon.stub(util, 'saveYamlFile').returns(true);

            const config = await input.getPipelineConfigForDeploy({_: ['']});
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
