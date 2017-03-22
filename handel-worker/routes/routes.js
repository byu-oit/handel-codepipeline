exports.index = function (req, res) {
    res.send('Handel CodePipeline Worker');
}

exports.healthcheck = function (req, res) {
    res.send("Four Seasons");
}

/**
 * Register this worker to perform deploys for a new CodePipeline
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
exports.register = function(req, res) {
    //TODO - Require AWS keypair to validate that the user is authorized to register (this will be a public endpoint)
    res.send('NOT IMPLEMENTED');
}

/**
 * Stream the log file for a particular deploy of a project
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
exports.streamLogFile = function (req, res) {
    //TODO Should this be open to anyone (no secure logs, only accessible from BYU CIDR, no auth initially?)
    res.send('NOT IMPLEMENTED');
}