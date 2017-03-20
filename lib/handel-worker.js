const express = require('express');
const app = express();
const routes = require('./routes/routes');

app.get('/', routes.index);
app.get('/healthcheck', routes.healthcheck);
app.post('/register', routes.register);
app.get('/project/:projectName/log/:externalExecutionId', routes.streamLogFile);

app.listen(5000, function () {
    console.log('Started up server on port 5000');
})