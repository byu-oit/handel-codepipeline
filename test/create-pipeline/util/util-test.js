const util = require('../../../create-pipeline/util/util');
const expect = require('chai').expect;

describe('util module', function() {
    describe('loadYamlFile', function() {
        it('should load the file on success', function() {
            let loadedYaml = util.loadYamlFile(`${__dirname}/test.yml`); 
            expect(loadedYaml.key).to.equal('value');
        });

        it('should return null on error', function() {
            let loadedYaml = util.loadYamlFile(`${__dirname}/nonexistent.yml`);
            expect(loadedYaml).to.be.null;
        });
    });
});