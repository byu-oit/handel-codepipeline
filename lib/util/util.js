const yaml = require('js-yaml');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const handlebars = require('handlebars');

/**
 * Takes the given directory path and zips it up and stores it
 *   in the given file path
 * 
 * @param {String} directoryPath - The full path to the direcotry on disk to zip up
 * @param {String} filePath - The full path to the file on disk to write the zip to
 */
exports.zipDirectoryToFile = function(directoryPath, filePath) {
    return new Promise((resolve, reject) => {
        if(!fs.existsSync(directoryPath)) {
            throw new Error(`Directory path to be zipped does not exist: ${directoryPath}`);
        }

        let archive = archiver.create('zip', {});
        let output = fs.createWriteStream(filePath);
        archive.pipe(output);
        archive.directory(directoryPath, '') //The 2nd param makes all the files just be included at the root with no directory
        archive.finalize();
        output.on('close', function() {
            resolve();
        });
        output.on('error', function(err) {
            reject(err);
        });
    });
}

exports.getAccountConfig = function(accountConfigsPath, accountId) {
    let accountConfigFilePath = `${accountConfigsPath}/${accountId}.yml`
    if(fs.existsSync(accountConfigFilePath)) {
        let accountConfig = exports.loadYamlFile(accountConfigFilePath);
        return accountConfig;
    }
    else {
        throw new Error(`Expected account config file at ${accountConfigFilePath} for ${accountId}`);
    }
}

/**
 * Reads all the phase deployer modules out of the 'phases' directory
 * 
 * @returns {Object} - An object of phase deployer objects with the service name as keys
 */
exports.getPhaseDeployers = function() {
    let deployers = {};
    
    let servicesPath = path.join(__dirname, '../phases')
    let serviceTypes = fs.readdirSync(servicesPath);
    serviceTypes.forEach(serviceType => {
        let servicePath = `${servicesPath}/${serviceType}`;
        if(fs.lstatSync(servicePath).isDirectory()) { 
            deployers[serviceType] = require(servicePath);
        }
    });

    return deployers;
}

exports.saveYamlFile = function(filePath, yamlObject) {
    try {
        return fs.writeFileSync(filePath, yaml.safeDump(yamlObject), 'utf8');
    }
    catch(e) {
        throw e;
    }
}

exports.loadYamlFile = function(filePath) {
    try {
        return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    }
    catch(e) {
        return null;
    }
}

exports.loadJsonFile = function(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch(e) {
        return null;
    }
}

exports.loadFile = function(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch(e) {
        return null;
    }
}

/**
 * Given a handlebars template filename and a Javascript object of the variables
 * to inject in that template, compiles and returns the template
 * 
 * @param {String} filename - The full path of the template file on disk to read 
 * @param {Object} variables - A Javascript object containing the variables to be used by Handlebars for the template
 * @returns {String} - The finished template with variables replaced
 */
exports.compileHandlebarsTemplate = function(filename, variables) {
    //TODO - This doesn't handle errors yet
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf-8', function(error, source) {
            //Register any helpers we need
            let template = handlebars.compile(source);
            let output = template(variables);
            resolve(output);
        });
    });
}