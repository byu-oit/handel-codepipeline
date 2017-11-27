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
import * as AWS from 'aws-sdk';
import { expect } from 'chai';
import { AccountConfig } from 'handel/src/datatypes/account-config';
import * as sinon from 'sinon';
import awsWrapper from '../../src/aws/aws-wrapper';
import * as codepipelineCalls from '../../src/aws/codepipeline-calls';
import * as iamCalls from '../../src/aws/iam-calls';
import * as util from '../../src/common/util';

describe('codepipelineCalls module', () => {
    let sandbox: sinon.SinonSandbox;
    let accountConfig: AccountConfig;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();

        accountConfig = util.loadYamlFile(`${__dirname}/../example-account-config.yml`);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('createPipeline', () => {
        it('should create the pipeline', async () => {
            const pipelineName = 'my-pipeline';
            const appName = 'my-app';
            const pipelinePhases: AWS.CodePipeline.StageDeclaration[] = [];
            const codePipelineBucketName = 'FakeBucket';

            const role = {
                Arn: 'FakeArn'
            };
            const createRoleStub = sandbox.stub(iamCalls, 'createRoleIfNotExists').resolves(role);
            const createPolicyStub = sandbox.stub(iamCalls, 'createPolicyIfNotExists').resolves(role);
            const attachPolicyStub = sandbox.stub(iamCalls, 'attachPolicyToRole').resolves({});
            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves(role);
            const createPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'createPipeline').resolves({
                pipeline: {}
            });

            const pipeline = await codepipelineCalls.createPipeline(appName, pipelineName, accountConfig, pipelinePhases, codePipelineBucketName);
            expect(createRoleStub.callCount).to.equal(1);
            expect(createPolicyStub.callCount).to.equal(1);
            expect(attachPolicyStub.callCount).to.equal(1);
            expect(getRoleStub.callCount).to.equal(1);
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('getPipeline', () => {
        it('should return null when the pipeline does not exist', async () => {
            const getPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'getPipeline').rejects({
                code: 'PipelineNotFoundException'
            });
            const pipeline = await codepipelineCalls.getPipeline('FakeName');
            expect(getPipelineStub.callCount).to.equal(1);
            expect(pipeline).to.equal(null);
        });

        it('should return the pipeline when it exists', async () => {
            const getPipelineStub = sandbox.stub(awsWrapper.codePipeline, 'getPipeline').resolves({
                pipeline: {}
            });
            const pipeline = await codepipelineCalls.getPipeline('FakeName');
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('updatePipeline', () => {
        it('should update the pipeline', async () => {
            const pipelinePhases: AWS.CodePipeline.StageDeclaration[] = [];

            const getRoleStub = sandbox.stub(iamCalls, 'getRole').resolves({
                Arn: 'FakeArn'
            });
            const updatePipelineStub = sandbox.stub(awsWrapper.codePipeline, 'updatePipeline').resolves({
                pipeline: {}
            });

            const pipeline = await codepipelineCalls.updatePipeline('my-app', 'my-pipeline', accountConfig, pipelinePhases, 'FakeBucket');
            expect(getRoleStub.callCount).to.equal(1);
            expect(updatePipelineStub.callCount).to.equal(1);
            expect(pipeline).to.deep.equal({});
        });
    });

    describe('deletePipeline', () => {
        it('should delete the pipeline', async () => {
            const deletePipelineStub = sandbox.stub(awsWrapper.codePipeline, 'deletePipeline').resolves(true);

            const success = await codepipelineCalls.deletePipeline('FakeApp', 'FakePipeline');
            expect(success).to.equal(true);
        });
    });
});
