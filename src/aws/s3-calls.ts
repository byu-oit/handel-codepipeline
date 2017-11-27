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
import * as fs from 'fs';
import awsWrapper from './aws-wrapper';

export async function uploadFile(bucketName: string, key: string, filePath: string) {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream
    };
    const uploadResponse = await awsWrapper.s3.upload(uploadParams);
    return uploadResponse;
}

export async function getBucket(bucketName: string) {
    const response = await awsWrapper.s3.listBuckets();
    if(!response.Buckets) {
        return null; // None found
    }
    else {
        for(const bucket of response.Buckets) {
            if(bucket.Name === bucketName) {
                return bucket; // Found bucket
            }
        }
        return null; // None found
    }
}

export async function createBucket(bucketName: string, region: string) {
    const createParams: AWS.S3.CreateBucketRequest = {
        Bucket: bucketName
    };
    if(region !== 'us-east-1') { // If you specify us-east-1 it will fail (this is the default)
        createParams.CreateBucketConfiguration = {
            LocationConstraint: region
        };
    }
    const response = await awsWrapper.s3.createBucket(createParams);
    return exports.getBucket(bucketName);
}

export async function createBucketIfNotExists(bucketName: string, region: string) {
    const bucket = await exports.getBucket(bucketName);
    if(!bucket) { // Doesn't exist
        return exports.createBucket(bucketName, region);
    }
    return bucket;
}
