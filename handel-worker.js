const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const routes = require('./handel-worker/routes');

//Set up middleware
app.use( bodyParser.json() ); //support json bodies
app.use(bodyParser.urlencoded({ //suport url-encoded bodies
  extended: true
})); 

//Set up routes
app.get('/', routes.index);
app.get('/healthcheck', routes.healthcheck);
app.post('/register', routes.register);
app.get('/project/:projectName', routes.projectView);
app.get('/project/:projectName/log/:externalExecutionId', routes.streamLogFile);

app.listen(5000, function () {
    console.log('Started up server on port 5000');
})