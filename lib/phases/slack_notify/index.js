// function getSlackNotifyPhase(phaseSpec, slackUrl) {
//     winston.info(`Creating slack notification phase '${phaseSpec.name}'`);

//     let userParameters = {
//         webhook: slackUrl,
//         message: 'Finished deploying pipeline', //TODO - Make this better
//         username: 'Handel CodePipeline Notify',
//         channel: phaseSpec.channel
//     };
//     let functionName = "HandelCodePipelineSlackNotifyLambda";

//     return {
//         name: phaseSpec.name,
//         actions: [
//             {
//                 inputArtifacts: [],
//                 name: phaseSpec.name,
//                 actionTypeId: {
//                     category: "Invoke",
//                     owner: "AWS",
//                     version: "1",
//                     provider: "Lambda"
//                 },
//                 configuration: {
//                     FunctionName: functionName,
//                     UserParameters: JSON.stringify(userParameters)
//                 },
//                 runOrder: 1
//             }
//         ]
//     }
// }
