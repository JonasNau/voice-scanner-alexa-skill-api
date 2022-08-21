require('module-alias/register')

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
    console.log(await permissionFunctions.userHasPermissions("c68cefbc-2364-48ab-a390-ad670ca6ebfd", {"canResetPassword": true, "SETTINGS_usersCanSignUp": false}, false))
    console.log(await permissionFunctions.getPermissionRankingUser("c68cefbc-2364-48ab-a390-ad670ca6ebfd"));
}

run();

//loggingFunctions.myLogger.getDirectories(".")

//test


//loggingFunctions.myLogger.logToConsole("Directories", "debug", {meta: getDirectories(".")}, loggingFunctions.loggingFormats.simple)


//Import Routs
const authRoute = require("./routs/auth");
const adminRoute = require("./routs/admin");

//Middlewares
app.use(express.json());

//Route Middlewares
app.use("/api/user", authRoute);

app.listen(3000, () => console.log("Up and running"));
