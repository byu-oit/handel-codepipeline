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

exports.getPipelineConfigInfo = function() {
    //Questions
        //What is your GitHub info? (username, repo, branch, token)
        //Do you want slack notifications (get webhook)
        //For each env type:
            //Do you want runscope tests?
            //Do you want ghost inspector tests?
        //
}


exports.createCodePipeline = function(accountConfigs, handelFile, workerStacks) {
    //Create pipeline (one per account)
        //Create phases
            //source
            //build
            //dev deploy (if applicable)
            //runscope tests for dev (if applicable)
            //ghost inspector tests for dev (if applicable)
            //stage deploy (if applicable)
            //manual action confirmation (if applicable)
            //prod (if applicable)
            //notify
    

}

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