import { AccountConfig } from 'handel/src/datatypes/account-config';

export interface PhaseConfig {
    type: string;
    name: string;
}

export class PipelineContext {
    public appName: string;
    public pipelineName: string;
    public phaseContexts: any; // TODO - Make this better
    public accountConfig: AccountConfig;
}

export class PhaseContext<Config extends PhaseConfig> {
    public appName: string;
    public phaseName: string;
    public phaseType: string;
    public codePipelineBucketName: string;
    public pipelineName: string;
    public accountConfig: AccountConfig;
    public params: Config;
    public secrets: any; // TODO - Change this to its own type later

    constructor(appName: string, phaseName: string, phaseType: string, codePipelineBucketName: string, pipelineName: string,
                accountConfig: AccountConfig, params: Config, secrets: any) {
        this.appName = appName;
        this.phaseName = phaseName;
        this.phaseType = phaseType;
        this.codePipelineBucketName = codePipelineBucketName;
        this.pipelineName = pipelineName;
        this.accountConfig = accountConfig;
        this.params = params;
        this.secrets = secrets;
    }
}
