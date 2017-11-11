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
const util = require('../../dist/common/util');
const expect = require('chai').expect;
const fs = require('fs');

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

    describe('getAccountConfig', function() {
        it('should return the requested yaml file', function() {
            let config = util.getAccountConfig(__dirname, 'test');
            expect(config.key).to.equal('value');
        })        
    });

    describe('getPhaseDeployers', function() {
        it('should load and return the deployers', function() {
            let phaseDeployers = util.getPhaseDeployers();
            expect(phaseDeployers.github).to.not.be.null;
        })
    });

    describe('zipDirectoryToFile', function() {
        let zippedPath = `${__dirname}/zipped-test-file.zip`;

        afterEach(function() {
            if(fs.existsSync(zippedPath)) {
                fs.unlinkSync(zippedPath); //Ensure created ZIP archive gets deleted
            }
        });

        it('should zip the given directory if it exists', function() {
            return util.zipDirectoryToFile(__dirname, zippedPath)
                .then(() => {
                    expect(fs.existsSync(zippedPath)).to.be.true;
                });
        });

        it('should throw an error if the given directory doesnt exist', function() {
            return util.zipDirectoryToFile('${__dirname}/myfakedir/', zippedPath)
                .then(() => {
                    expect(true).to.be.false; //Should not get here
                })
                .catch(err => {
                    expect(err.message).to.contain('Directory path to be zipped does not exist');
                });
        });
    });
});