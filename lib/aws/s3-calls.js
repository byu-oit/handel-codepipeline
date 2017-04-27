const AWS = require('aws-sdk');

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

exports.createBucket = function(bucketName) {
    const s3 = new AWS.S3({apiVersion: '2006-03-01'});
    let createParams = {
        Bucket: bucketName,
        CreateBucketConfiguration: {
            LocationConstraint: 'us-west-2'
        }
    }
    return s3.createBucket(createParams).promise()
        .then(response => {
            return exports.getBucket(bucketName);
        });
}

exports.createBucketIfNotExists = function(bucketName) {
    return exports.getBucket(bucketName)
        .then(bucket => {
            if(!bucket) { //Doesn't exist
                return exports.createBucket(bucketName);
            }
            return bucket;
        });
}