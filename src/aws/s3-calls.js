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
const AWS = require('aws-sdk');
const fs = require('fs');

exports.uploadFile = function(bucketName, key, filePath) {
    let s3 = new AWS.S3({apiVersion: '2006-03-01'});
    let fileStream = fs.createReadStream(filePath);
    let uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream
    }
    return s3.upload(uploadParams).promise()
        .then(uploadResponse => {
            return uploadResponse;
        });
}

exports.getBucket = function(bucketName) {
    const s3 = new AWS.S3({apiVersion: '2006-03-01'});
    return s3.listBuckets().promise()
        .then(response => {
            for(let bucket of response.Buckets) {
                if(bucket.Name === bucketName) {
                    return bucket; //Found bucket
                }
            }
            return null; //None found
        });
}

exports.createBucket = function(bucketName, region) {
    const s3 = new AWS.S3({apiVersion: '2006-03-01'});
    let createParams = {
        Bucket: bucketName
    }
    if(region !== 'us-east-1') { //If you specify us-east-1 it will fail (this is the default)
        createParams.CreateBucketConfiguration = {
            LocationConstraint: region
        }
    }
    return s3.createBucket(createParams).promise()
        .then(response => {
            return exports.getBucket(bucketName);
        });
}

exports.createBucketIfNotExists = function(bucketName, region) {
    return exports.getBucket(bucketName)
        .then(bucket => {
            if(!bucket) { //Doesn't exist
                return exports.createBucket(bucketName, region);
            }
            return bucket;
        });
}