const {databaseConnection} = require("../database/db-connection.js");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

const loggingFunctions = require("../logging/logging-functions");


async function getUUIDFromUsername(username) {
    return await databaseConnection.getValueFromDatabase("users", "uuid", "username", username, 1, false);
}

async function getUsernameFromUUID(uuid) {
    return await databaseConnection.getValueFromDatabase("users", "username", "uuid", uuid, 1, false);
}




module.exports = {
    getUUIDFromUsername,
    getUsernameFromUUID
}