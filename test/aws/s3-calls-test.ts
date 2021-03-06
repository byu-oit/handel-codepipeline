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
import * as s3Calls from '../../src/aws/s3-calls';

describe('s3 calls module', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('getBucket', () => {
        it('should return the bucket if found', async () => {
            const bucketName = 'FakeBucket';
            const listBucketsStub = sinon.stub(awsWrapper.s3, 'listBuckets').resolves({
                Buckets: [{
                    Name: bucketName
                }]
            });

            const bucket = await s3Calls.getBucket(bucketName);
            expect(listBucketsStub.callCount).to.equal(1);
            expect(bucket).to.not.equal(null);
            expect(bucket!.Name).to.equal(bucketName);
        });

        it('should return null if the bucket is not found', async () => {
            const bucketName = 'FakeBucket';
            const listBucketsStub = sinon.stub(awsWrapper.s3, 'listBuckets').resolves({
                Buckets: [{
                    Name: 'SomeOtherBucket'
                }]
            });

            const bucket = await s3Calls.getBucket(bucketName);
            expect(listBucketsStub.callCount).to.equal(1);
            expect(bucket).to.equal(null);
        });
    });

    describe('createBucket', () => {
        it('should create the bucket', async () => {
            const bucketName = 'FakeBucket';
            const createBucketStub = sinon.stub(awsWrapper.s3, 'createBucket').resolves({});
            const getBucketStub = sinon.stub(s3Calls, 'getBucket').resolves({
                Name: bucketName
            });

            const bucket = await s3Calls.createBucket(bucketName, 'us-west-2');
            expect(bucket).to.not.equal(null);
            expect(bucket.Name).to.equal(bucketName);
            expect(createBucketStub.callCount).to.equal(1);
            expect(getBucketStub.callCount).to.equal(1);
        });
    });

    describe('createBucketIfNotExists', () => {
        it('should create the bucket if it doesnt exist', async () => {
            const bucketName = 'FakeBucket';
            const getBucketStub = sinon.stub(s3Calls, 'getBucket').resolves(null);
            const createBucketStub = sinon.stub(s3Calls, 'createBucket').resolves({
                Name: bucketName
            });

            const bucket = await s3Calls.createBucketIfNotExists(bucketName, 'us-west-2');
            expect(bucket.Name).to.equal(bucketName);
            expect(getBucketStub.callCount).to.equal(1);
            expect(createBucketStub.callCount).to.equal(1);
        });

        it('should return the bucket if it exists', async () => {
            const bucketName = 'FakeBucket';
            const getBucketStub = sinon.stub(s3Calls, 'getBucket').resolves({
                Name: bucketName
            });
            const createBucketStub = sinon.stub(s3Calls, 'createBucket').resolves({});

            const bucket = await s3Calls.createBucketIfNotExists(bucketName, 'us-west-2');
            expect(bucket.Name).to.equal(bucketName);
            expect(getBucketStub.callCount).to.equal(1);
            expect(createBucketStub.callCount).to.equal(0);
        });
    });
});
