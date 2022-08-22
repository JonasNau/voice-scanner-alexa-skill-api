require('module-alias/register')
const bodyParser = require('body-parser')

const http = require('http')
const https = require('https')
const fs = require('fs');
     
     

//Import express
const express = require("express");
const app = express();

//Import functions
const objectFunctions = require("./includes/object-functions");
const settingsFunctions = require("./includes/settings/settings-functions");
const userFunctions = require("./includes/user/user-functions");
const permissionFunctions = require("./includes/permissions/permission-functions");
const loggingFunctions = require("./includes/logging/logging-functions");


const { databaseConnection } = require("./includes/database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");


async function run() {
    // console.log(await permissionFunctions.userHasPermissions("c68cefbc-2364-48ab-a390-ad670ca6ebfd", {"canResetPassword": true, "SETTINGS_usersCanSignUp": false}, false))
    // console.log(await permissionFunctions.getPermissionRankingUser("c68cefbc-2364-48ab-a390-ad670ca6ebfd"));
    
    // await permissionFunctions.createPermission("ACCESS_ROUTE_voiceScanner", "Access Route Voice Scanner", 1, true, ["/api/voiceScanner"]);
    // await permissionFunctions.addPermisionGroup()
}

run();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

//Import Routs
const authRoute = require("./routs/auth");
app.use("/api/user", authRoute);

const voiceScannerRoute = require("./routs/voiceScanner/voiceScanner");
app.use("/api/voiceScanner", voiceScannerRoute);

//Middlewares
app.use(express.json());



http.createServer(app).listen(3000)

const options = {
    key: fs.readFileSync('./sslCerts/key.pem'),
    cert: fs.readFileSync('./sslCerts/cert.pem')
    };

https.createServer(options, app).listen(3001)
