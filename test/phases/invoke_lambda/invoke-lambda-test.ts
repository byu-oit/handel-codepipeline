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
import { expect } from 'chai';
import { AccountConfig } from 'handel/src/datatypes';
import * as util from '../../../src/common/util';
import { PhaseContext } from '../../../src/datatypes/index';
import * as invokeLambda from '../../../src/phases/invoke_lambda';

describe('invoke lambda module', () => {
    let accountConfig: AccountConfig;
    let phaseConfig: invokeLambda.InvokeLambdaConfig;
    let phaseContext: PhaseContext<invokeLambda.InvokeLambdaConfig>;

    beforeEach(() => {
        accountConfig = util.loadYamlFile(`${__dirname}/../../example-account-config.yml`);

        phaseConfig = {
            type: 'invoke_lambda',
            name: 'SomeFunction',
            function_name: 'MyFunction',
            function_parameters: {
                myParam: 'myValue'
            }
        };

        phaseContext = new PhaseContext<invokeLambda.InvokeLambdaConfig>(
            'myapp',
            'myphase',
            'codecommit',
            'SomeBucket',
            'dev',
            accountConfig,
            phaseConfig,
            {}
        );
    });

    describe('check', () => {
        it('should return an error when function_name is not given', () => {
            delete phaseConfig.function_name;
            const errors = invokeLambda.check(phaseConfig);
            expect(errors.length).to.equal(1);
            expect(errors[0]).to.contain(`'function_name' parameter is required`);
        });

        it('should return an empty array when required params present', () => {
            const errors = invokeLambda.check(phaseConfig);
            expect(errors).to.deep.equal([]);
        });
    });

    describe('getSecretsForPhase', () => {
        it('should do nothing', async () => {
            const results = await invokeLambda.getSecretsForPhase(phaseConfig);
            expect(results).to.deep.equal({});
        });
    });

    describe('deployPhase', () => {
        it('should create the role, upload the file, and create the stack when it doesnt exist', async () => {
            const phaseSpec = await invokeLambda.deployPhase(phaseContext, accountConfig);
            expect(phaseSpec.name).to.equal(phaseContext.phaseName);
            expect(phaseSpec.actions[0]!.configuration!.FunctionName).to.equal('MyFunction');
            expect(phaseSpec.actions[0]!.configuration!.UserParameters).to.equal(`{\"myParam\":\"myValue\"}`);
        });
    });

    describe('deletePhase', () => {
        it('should do nothing', async () => {
            const result = await invokeLambda.deletePhase(phaseContext, accountConfig);
            expect(result).to.equal(true);
        });
    });
});
