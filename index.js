// Example express application adding the parse-server module to expose Parse
// compatible API routes.

if (process.env.NODE_ENV === "DEV"){
    require('dotenv').config();
}
require('./src/queue');

const express = require('express');
const helmet = require('helmet');
const ParseServer = require('parse-server').ParseServer;
const path = require('path');

global.masterKey =  {useMasterKey: true};

const merchantApi = require('./src/api/merchant');
const clientsApi = require('./src/api/client');
const webhook = require('./src/webhooks');
const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

const cors = require('cors');
const bodyParser = require('body-parser');
const api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    // classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

const app = express();

// Serve the Parse API on the /parse URL prefix
const mountPath = process.env.PARSE_MOUNT || '/parse';

app.use(helmet())
app.use(mountPath, api);


app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use('/webhooks', webhook);
app.use('/merchants/v1', merchantApi);
app.use('/clients/v1', clientsApi);
app.get('/', function(req, res) {
  res.status(200).json({
      status: true,
      message: 'Hi there. 😊',
      version: '1.0'
  });
});


app.use(function(req, res, next){
    res.status(404).send('Hmm. Seems you hit the wrong button');
});
const port = process.env.PORT || 1337;
const httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('server running on port ' + port + '.');
    app.disable('x-powered-by');

});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
