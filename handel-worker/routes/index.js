exports.index = function (req, res) {
    res.send('Handel CodePipeline Worker');
}

exports.healthcheck = function (req, res) {
    res.send("Four Seasons");
}

/**
 * List the executions for a project
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
exports.projectView = function(req, res) {
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
    
    //Stream out log file 
    
    res.send('NOT IMPLEMENTED');
}