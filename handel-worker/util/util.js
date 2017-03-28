const AdmZip = require('adm-zip');
const exec = require('child_process').exec;
const winston = require('winston');

exports.downloadFileFromS3 = function(downloadPath, s3Bucket, s3Key) {
    //TODO - I couldn't get this working using the AWS Node SDK and Node's File IO.
    //Need to get it working to eliminate the dependency on the AWS CLI.
    return new Promise((resolve, reject) => {
        let configureCommand = `aws configure set s3.signature_version s3v4`;
        var downloadCmd = `aws s3 cp s3://${s3Bucket}/${s3Key} ${downloadPath}`;

        exec(configureCommand, function(error, stdout, stderr) {
            if(error) {
                reject(error);
            }
            else {
                exec(downloadCmd, function(error, stdout, stdin) {
                    if(error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    });
}

exports.unzipFileToDirectory = function(zipFilePath, unzipDirPath) {
    winston.info(`Unzipping file ${zipFilePath} to ${unzipDirPath}`);
    var zip = new AdmZip(zipFilePath);
    zip.extractAllTo(unzipDirPath, true);
    winston.info(`Unzipped file ${zipFilePath} to ${unzipDirPath}`);
}