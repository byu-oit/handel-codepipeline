const yaml = require('js-yaml');
const fs = require('fs');

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
