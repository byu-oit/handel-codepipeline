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

const AWS = require('aws-sdk');

exports.cloudFormation = {
    describeStacks: function (params) {
        const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
        return cloudformation.describeStacks(params).promise();
    },
    waitFor: function (stackState, params) {
        const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
        return cloudformation.waitFor(stackState, params).promise();
    },
    createStack: function (params) {
        const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
        return cloudformation.createStack(params).promise();
    },
    deleteStack: function (params) {
        const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
        return cloudformation.deleteStack(params).promise();
    }
}

exports.codeBuild = {
    createProject: function (params) {
        const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
        return codeBuild.createProject(params).promise()
    },
    updateProject: function (params) {
        const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
        return codeBuild.updateProject(params).promise();
    },
    batchGetProjects: function (params) {
        const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
        return codeBuild.batchGetProjects(params).promise();
    },
    deleteProject: function (params) {
        const codeBuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
        return codeBuild.deleteProject(params).promise();
    }
}

exports.iam = {
    createRole: function (params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.createRole(params).promise();
    },
    getRole: function (params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.getRole(params).promise();
    },
    attachRolePolicy: function (params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.attachRolePolicy(params).promise();
    },
    getPolicy: function (params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.getPolicy(params).promise();
    },
    createPolicy: function(params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.createPolicy(params).promise();
    },
    listRoles: function(params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.listRoles(params).promise();
    },
    deleteRole: function(params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.deleteRole(params).promise();
    },
    deletePolicy: function(params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.deletePolicy(params).promise();
    },
    detachRolePolicy: function(params) {
        const iam = new AWS.IAM({ apiVersion: '2010-05-08' });
        return iam.detachRolePolicy(params).promise();
    }
}

exports.s3 = {
    upload: function(params) {
        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        return  s3.upload(params).promise()
    },
    listBuckets: function() {
        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        return s3.listBuckets().promise();
    },
    createBucket: function(params) {
        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        return s3.createBucket(params).promise();
    }
}