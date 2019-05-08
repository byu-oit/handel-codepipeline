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
import {PluginManager} from '@byu-oit/live-plugin-manager';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as yaml from 'js-yaml';
import * as path from 'path';
import {HandelCodePipelineFile, PhaseDeployers} from '../datatypes';

/**
 * Takes the given directory path and zips it up and stores it
 *   in the given file path
 */
export function zipDirectoryToFile(directoryPath: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(directoryPath)) {
            throw new Error(`Directory path to be zipped does not exist: ${directoryPath}`);
        }

        const archive = archiver.create('zip', {});
        const output = fs.createWriteStream(filePath);
        archive.pipe(output);
        archive.directory(directoryPath, ''); // The 2nd param makes all the files just be included at the root with no directory
        archive.finalize();
        output.on('close', () => {
            resolve();
        });
        output.on('error', (err) => {
            reject(err);
        });
    });
}

export function getAccountConfig(accountConfigsPath: string, accountId: string) {
    const accountConfigFilePath = `${accountConfigsPath}/${accountId}.yml`;
    if (fs.existsSync(accountConfigFilePath)) {
        const accountConfig = exports.loadYamlFile(accountConfigFilePath);
        return accountConfig;
    } else {
        throw new Error(`Expected account config file at ${accountConfigFilePath} for ${accountId}`);
    }
}

/**
 * Reads all the phase deployer modules out of the 'phases' directory
 */
export function getPhaseDeployers(): PhaseDeployers {
    const deployers: any = {}; // TODO - Need to change this to something more constrained
    const servicesPath = path.join(__dirname, '../phases');
    const serviceTypes = fs.readdirSync(servicesPath);
    serviceTypes.forEach(serviceType => {
        const servicePath = `${servicesPath}/${serviceType}`;
        if (fs.lstatSync(servicePath).isDirectory()) {
            deployers[serviceType] = require(servicePath);
        }
    });

    return deployers;
}

export async function getCustomDeployers(manager: PluginManager, handelCodePipelineFile: HandelCodePipelineFile): Promise<PhaseDeployers> {
    const deployers: any = {}; // TODO - Need to change this to something more constrained
    const extensions = handelCodePipelineFile.extensions;
    if (extensions) {
        for (const alias in extensions) {
            if (!extensions.hasOwnProperty(alias)) {
                continue;
            }
            const pluginInfo = await manager.install(extensions[alias]);
            deployers[alias] = manager.require(pluginInfo.name);
        }
    }

    return deployers;
}

export function saveYamlFile(filePath: string, yamlObject: any) {
    try {
        return fs.writeFileSync(filePath, yaml.safeDump(yamlObject), 'utf8');
    } catch (e) {
        throw e;
    }
}

export function loadYamlFile(filePath: string): any {
    try {
        return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return null;
    }
}

export function loadJsonFile(filePath: string): any {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return null;
    }
}

export function loadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return null;
    }
}

/**
 * Given a handlebars template filename and a Javascript object of the variables
 * to inject in that template, compiles and returns the template
 */
export function compileHandlebarsTemplate(filename: string, variables: any): Promise<string> {
    // TODO - This doesn't handle errors yet
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf-8', (error, source) => {
            // Register any helpers we need
            const template = handlebars.compile(source);
            const output = template(variables);
            resolve(output);
        });
    });
}
