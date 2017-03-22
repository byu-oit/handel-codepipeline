// function getAccountToEnvMappingsFromHandelFile(accountConfigs, handelFile) {
//     let accountToEnvMappings = {}
//     for(let accountId in accountConfigs) {
//         accountToEnvMappings[accountId] = []
//     }

//     for(let envName in handelFile.environments) {
//         if(envName.startsWith("prod")) {
//             accountToEnvMappings[]
//         }
//         else if(envName.startsWith("stage")) {

//         }
//         else if(envName.startsWith("dev")) {

//         }
//         else {
//             console.log(`ERROR: This CodePipeline script on top of Handel only allows environments that start with 'dev', 'stage', or 'prod'`);
//             process.exit(1);
//         }
//     }
// }


//Read their deployspec file
    //'prod*' is a special file name that goes in prod accounts
    //'stage*' is a special env name that goes in stage accounts
    //'dev*' is a special env name that goes in dev accounts
    //Everything else gets ignored (for now)

//Create code pipeline
    //Source phase
    //Include code build action
    //Include Handel worker action
        //This will deploy to all relevant envs in parallel (prod, stage, dev, etc.)
    //Acceptance tests phase (if requested)