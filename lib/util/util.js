const yaml = require('js-yaml');
const fs = require('fs');

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

exports.loadFile = function(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch(e) {
        return null;
    }
}
