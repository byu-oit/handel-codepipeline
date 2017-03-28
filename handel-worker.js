const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
const routes = require('./handel-worker/routes');
const worker = require('./handel-worker/worker')

//Set up middleware
app.use( bodyParser.json() ); //support json bodies
app.use(bodyParser.urlencoded({ //suport url-encoded bodies
  extended: true
})); 

//Set up routes
app.get('/', routes.index);
app.get('/healthcheck', routes.healthcheck);
app.get('/project/:projectName', routes.projectView);
app.get('/project/:projectName/log/:externalExecutionId', routes.streamLogFile);

app.listen(5000, function () {
    console.log('Started up server on port 5000');
});

//Start worker to execute jobs from CodePipeline
setInterval(function() {
    worker.executeHandelJobs();
}, 10000);