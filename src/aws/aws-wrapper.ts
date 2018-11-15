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

/**
 * This module exists because I haven't yet been able to figure out a way
 * to mock the AWS SDK when using Sinon and TypeScript. The 'aws-sdk-mock'
 * tool doesn't work in TypeScript, and I have yet to find out how to use
 * Sinon to mock the SDK when using promises.
 */

import * as AWS from 'aws-sdk';

const awsWrapper = {
    cloudFormation: {
        describeStacks: (params: AWS.CloudFormation.DescribeStacksInput): Promise<AWS.CloudFormation.DescribeStacksOutput> => {
            const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
            return cloudformation.describeStacks(params).promise();
        },
        waitFor: (stackState: any, params: AWS.CloudFormation.DescribeStacksInput): Promise<AWS.CloudFormation.DescribeStacksOutput> => {
            const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
            return cloudformation.waitFor(stackState, params).promise();
        },
        createStack: (params: AWS.CloudFormation.CreateStackInput): Promise<AWS.CloudFormation.CreateStackOutput> => {
            const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
            return cloudformation.createStack(params).promise();
        },
        deleteStack: (params: AWS.CloudFormation.DeleteStackInput) => {
            const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
            return cloudformation.deleteStack(params).promise();
        }
    },
    codeBuild: {
        createProject: (params: AWS.CodeBuild.CreateProjectInput): Promise<AWS.CodeBuild.CreateProjectOutput> => {
            const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
            return codeBuild.createProject(params).promise();
        },
        updateProject: (params: AWS.CodeBuild.UpdateProjectInput): Promise<AWS.CodeBuild.UpdateProjectOutput> => {
            const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
            return codeBuild.updateProject(params).promise();
        },
        batchGetProjects: (params: AWS.CodeBuild.BatchGetProjectsInput): Promise<AWS.CodeBuild.BatchGetProjectsOutput> => {
            const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
            return codeBuild.batchGetProjects(params).promise();
        },
        deleteProject: (params: AWS.CodeBuild.DeleteProjectInput): Promise<AWS.CodeBuild.DeleteProjectOutput> => {
            const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
            return codeBuild.deleteProject(params).promise();
        }
    },
    iam: {
        createRole: (params: AWS.IAM.CreateRoleRequest): Promise<AWS.IAM.CreateRoleResponse> => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.createRole(params).promise();
        },
        getRole: (params: AWS.IAM.GetRoleRequest): Promise<AWS.IAM.GetRoleResponse> => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.getRole(params).promise();
        },
        attachRolePolicy: (params: AWS.IAM.AttachRolePolicyRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.attachRolePolicy(params).promise();
        },
        getPolicy: (params: AWS.IAM.GetPolicyRequest): Promise<AWS.IAM.GetPolicyResponse> => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.getPolicy(params).promise();
        },
        createPolicy: (params: AWS.IAM.CreatePolicyRequest): Promise<AWS.IAM.CreatePolicyResponse> => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.createPolicy(params).promise();
        },
        createPolicyVersion: (params: AWS.IAM.CreatePolicyVersionRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.createPolicyVersion(params).promise();
        },
        listPolicyVersions: (params: AWS.IAM.ListPolicyVersionsRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.listPolicyVersions(params).promise();
        },
        deletePolicyVersion: (params: AWS.IAM.DeletePolicyVersionRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.deletePolicyVersion(params).promise();
        },
        listRoles: (params: AWS.IAM.ListRolesRequest): Promise<AWS.IAM.ListRolesResponse> => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.listRoles(params).promise();
        },
        deleteRole: (params: AWS.IAM.DeleteRoleRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.deleteRole(params).promise();
        },
        deletePolicy: (params: AWS.IAM.DeletePolicyRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.deletePolicy(params).promise();
        },
        detachRolePolicy: (params: AWS.IAM.DetachRolePolicyRequest) => {
            const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
            return iam.detachRolePolicy(params).promise();
        }
    },
    s3: {
        upload: (params: AWS.S3.PutObjectRequest) => {
            const s3 = new AWS.S3({apiVersion: '2006-03-01'});
            return  s3.upload(params).promise();
        },
        listBuckets: () => {
            const s3 = new AWS.S3({apiVersion: '2006-03-01'});
            return s3.listBuckets().promise();
        },
        createBucket: (params: AWS.S3.CreateBucketRequest): Promise<AWS.S3.CreateBucketOutput> => {
            const s3 = new AWS.S3({apiVersion: '2006-03-01'});
            return s3.createBucket(params).promise();
        }
    },
    codePipeline: {
        createPipeline: (params: AWS.CodePipeline.CreatePipelineInput): Promise<AWS.CodePipeline.CreatePipelineOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.createPipeline(params).promise();
        },
        getPipeline: (params: AWS.CodePipeline.GetPipelineInput): Promise<AWS.CodePipeline.GetPipelineOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.getPipeline(params).promise();
        },
        updatePipeline: (params: AWS.CodePipeline.UpdatePipelineInput): Promise<AWS.CodePipeline.UpdatePipelineOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.updatePipeline(params).promise();
        },
        deletePipeline: (params: AWS.CodePipeline.DeletePipelineInput) => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.deletePipeline(params).promise();
        },
        putWebhook: (params: AWS.CodePipeline.PutWebhookInput): Promise<AWS.CodePipeline.PutWebhookOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.putWebhook(params).promise();
        },
        deleteWebhook: (params: AWS.CodePipeline.DeleteWebhookInput): Promise<AWS.CodePipeline.DeleteWebhookOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.deleteWebhook(params).promise();
        },
        registerWebhook: (params: AWS.CodePipeline.RegisterWebhookWithThirdPartyInput): Promise<AWS.CodePipeline.RegisterWebhookWithThirdPartyOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.registerWebhookWithThirdParty(params).promise();
        },
        deregisterWebhook: (params: AWS.CodePipeline.DeregisterWebhookWithThirdPartyInput): Promise<AWS.CodePipeline.DeregisterWebhookWithThirdPartyOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.deregisterWebhookWithThirdParty(params).promise();
        },
        listWebhooks: (): Promise<AWS.CodePipeline.ListWebhooksOutput> => {
            const codePipeline = new AWS.CodePipeline({ apiVersion: '2015-07-09' });
            return codePipeline.listWebhooks().promise();
        }
    },
    ssm: {
        putParameter: (params: AWS.SSM.PutParameterRequest): Promise<AWS.SSM.PutParameterResult> => {
            const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
            return ssm.putParameter(params).promise();
        },
        deleteParameter: (params: AWS.SSM.DeleteParameterRequest): Promise<AWS.SSM.DeleteParameterResult> => {
            const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
            return ssm.deleteParameter(params).promise();
        },
        deleteParameters: (params: AWS.SSM.DeleteParametersRequest): Promise<AWS.SSM.DeleteParametersResult> => {
            const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
            return ssm.deleteParameters(params).promise();
        }
    }
};

export default awsWrapper;
