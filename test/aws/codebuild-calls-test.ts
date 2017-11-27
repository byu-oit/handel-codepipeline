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
import * as sinon from 'sinon';
import awsWrapper from '../../src/aws/aws-wrapper';
import * as codeBuildCalls from '../../src/aws/codebuild-calls';

describe('codebuild calls module', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('createProject', () => {
        it('should create the project', async () => {
            const projectName = 'FakeProject';

            const createProjectStub = sandbox.stub(awsWrapper.codeBuild, 'createProject').resolves({
                project: {
                    name: projectName
                }
            });

            const project = await codeBuildCalls.createProject(projectName, projectName, 'pipeline',
                'phase', 'FakeImage', { SOME_KEY: 'some_value' },
                '777777777777', 'FakeArn', 'us-west-2', '');

            expect(createProjectStub.callCount).to.equal(1);
            expect(project!.name).to.equal(projectName);
        });
    });

    describe('updateProject', () => {
        it('should update the project', async () => {
            const projectName = 'FakeProject';

            const updateProjectStub = sandbox.stub(awsWrapper.codeBuild, 'updateProject').resolves({
                project: {
                    name: projectName
                }
            });

            const project = await codeBuildCalls.updateProject(projectName, projectName, 'pipeline',
                'phase', 'FakeImage', {}, '777777777777', 'FakeArn', 'us-west-2', '');
            expect(updateProjectStub.callCount).to.equal(1);
            expect(project!.name).to.equal(projectName);
        });
    });

    describe('getProject', () => {
        it('should return the project if it exists', async () => {
            const batchGetProjectsStub = sandbox.stub(awsWrapper.codeBuild, 'batchGetProjects').resolves({
                projects: [{}]
            });

            const project = await codeBuildCalls.getProject('FakeProject');
            expect(batchGetProjectsStub.callCount).to.equal(1);
            expect(project).to.deep.equal({});
        });

        it('should return null if the project doesnt exist', async () => {
            const batchGetProjectsStub = sandbox.stub(awsWrapper.codeBuild, 'batchGetProjects').resolves({
                projects: []
            });

            const project = await codeBuildCalls.getProject('FakeProject');
            expect(batchGetProjectsStub.callCount).to.equal(1);
            expect(project).to.deep.equal(null);
        });
    });

    describe('deleteProject', () => {
        it('should delete the project', async () => {
            const deleteProjectStub = sandbox.stub(awsWrapper.codeBuild, 'deleteProject').resolves(true);

            const success = await codeBuildCalls.deleteProject('FakeProject');
            expect(deleteProjectStub.callCount).to.equal(1);
            expect(success).to.equal(true);
        });
    });
});
