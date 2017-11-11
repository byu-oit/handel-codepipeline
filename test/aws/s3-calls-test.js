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
const s3Calls = require('../../dist/aws/s3-calls');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
const expect = require('chai').expect;

describe('s3 calls module', function() {
    let sandbox;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
        AWS.restore('S3');
    });

    describe('getBucket', function() {
        it('should return the bucket if found', function() {
            let bucketName = "FakeBucket";
            AWS.mock('S3', 'listBuckets', Promise.resolve({
                Buckets: [{
                    Name: bucketName
                }]
            }));

            return s3Calls.getBucket(bucketName)
                .then(bucket => {
                    expect(bucket).to.not.be.null;
                    expect(bucket.Name).to.equal(bucketName);
                });
        });

        it('should return null if the bucket is not found', function() {
            let bucketName = "FakeBucket";
            AWS.mock('S3', 'listBuckets', Promise.resolve({
                Buckets: [{
                    Name: "SomeOtherBucket"
                }]
            }));

            return s3Calls.getBucket(bucketName)
                .then(bucket => {
                    expect(bucket).to.be.null;
                });
        });
    });

    describe('createBucket', function() {
        it('should create the bucket', function() {
            let bucketName = "FakeBucket";
            AWS.mock('S3', 'createBucket', Promise.resolve({}));
            let getBucketStub = sandbox.stub(s3Calls, 'getBucket').returns(Promise.resolve({
                Name: bucketName
            }));

            return s3Calls.createBucket(bucketName)
                .then(bucket => {
                    expect(bucket).to.not.be.null;
                    expect(bucket.Name).to.equal(bucketName);
                    expect(getBucketStub.callCount).to.equal(1);
                });
        });
    });

    describe('createBucketIfNotExists', function() {
        it('should create the bucket if it doesnt exist', function() {
            let bucketName = "FakeBucket";
            let getBucketStub = sandbox.stub(s3Calls, 'getBucket').returns(Promise.resolve(null));
            let createBucketStub = sandbox.stub(s3Calls, 'createBucket').returns(Promise.resolve({
                Name: bucketName
            }));

            return s3Calls.createBucketIfNotExists(bucketName)
                .then(bucket => {
                    expect(bucket.Name).to.equal(bucketName);
                    expect(getBucketStub.callCount).to.equal(1);
                    expect(createBucketStub.callCount).to.equal(1);
                });
        });

        it('should return the bucket if it exists', function() {
            let bucketName = "FakeBucket";
            let getBucketStub = sandbox.stub(s3Calls, 'getBucket').returns(Promise.resolve({
                Name: bucketName
            }));
            let createBucketStub = sandbox.stub(s3Calls, 'createBucket').returns(Promise.resolve({}));

            return s3Calls.createBucketIfNotExists(bucketName)
                .then(bucket => {
                    expect(bucket.Name).to.equal(bucketName);
                    expect(getBucketStub.callCount).to.equal(1);
                    expect(createBucketStub.callCount).to.equal(0);
                });
        });
    });
});