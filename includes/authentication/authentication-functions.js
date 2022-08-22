const {databaseConnection} = require("../database/db-connection.js");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

const objectFunctions = require("../object-functions");
const dateFunctions = require("../date-functions");
const jwt = require("jsonwebtoken");
const permissionFunctions = require("../permissions/permission-functions");
const loggingFunctions = require("../logging/logging-functions");
const myLogger = loggingFunctions.myLogger;
const pathFunctions = require("../path-functions");
const FILE_NAME = pathFunctions.getNameOfCurrentFile(__filename);

async function userExists(username) {
    return await databaseConnection.valueInDatabaseExists("users", "username", username);
}

const bcrypt = require("bcryptjs");
async function passwordIsCorrect(password, passwordEntered) {
    return await bcrypt.compare(passwordEntered, password);
}



async function auth(request, response, permissionsNeeded = [], next) {
    //Determines whether a user is allowed to acces a route with the auth() middleware
    const token = request.header("auth-token");
    let isLoggedIn = await isLoggedIn_WithToken(token)
    if (isLoggedIn === true) {
        const uuid = await databaseConnection.getValueFromDatabase("auth_tokens", "uuid", "jsonwebtoken", token, 1, false);
        if (!await permissionFunctions.userHasPermissions(uuid, permissionsNeeded)) {
            myLogger.logToFILE("authentication-functions.log", `User ${uuid} was authenticated with token ${token} but has not all needed permissions to access.`, "info", permissionsNeeded, FILE_NAME, null, false);
            response.status(401).send({error: true, message: "Access denied", permissionsNeeded: permissionsNeeded})
            return false;
        }
        myLogger.logToFILE("authentication-functions.log", `User ${uuid} was authenticated with token ${token}.`, "info", null, FILE_NAME, false);
        next(); //Continue to the next middleware
        return true;
    }

    response.status(isLoggedIn.status).send(isLoggedIn);
}


async function isLoggedIn_WithToken(token) {
    if (!token) return {error: true, message: "No auth token found", status: 401};

    if (!await databaseConnection.valueInDatabaseExists("auth_tokens", "jsonwebtoken", token)) {
        myLogger.logToFILE("authentication-functions.log", `Token ${token} does not exist.`, "info", null, FILE_NAME, false);
        return {error: true, message: "Token does not exist.", status: 401};
    }

    try {
        jwt.verify(token, process.env.JWT_TOKEN_SECRET)
    } catch (err) {
        myLogger.logToFILE("authentication-functions.log", `Token ${token} could not be verified. Maybe the token secret has changed. Try to log in again.`, "info", null, FILE_NAME);
        return {error: true, message: "Token could not be verified. Maybe the token secret has changed. Try to log in again.", status: 401};
    }

    if (await JWTtokenIsExpired(token)) {
        await databaseConnection.deleteRowFromDatabase("auth_tokens", "jsonwebtoken", token);
        myLogger.logToFILE("authentication-functions.log", `Token ${token} is expired an was deleted`, "info", null, FILE_NAME, false);
        return {error: true, message: "Token is expired and was deleted.", status: 401};
    }
    return true;
}


async function JWTtokenIsExpired(token) {
    let expires = databaseConnection.getValueFromDatabase("auth_tokens", "expires", "jsonwebtoken", token, 1, false, false);
    if (objectFunctions.emptyVariable(expires) || !dateFunctions.makeDate(expires)) {
        return false;
    }
    expires = dateFunctions.makeDate(expires);
    return dateFunctions.isExpired(expires);
}

module.exports = {
    userExists,
    passwordIsCorrect,
    auth,
    isLoggedIn_WithToken,
    JWTtokenIsExpired,

}