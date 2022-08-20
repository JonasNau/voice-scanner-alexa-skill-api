const {databaseConnection} = require("../database/db-connection.js");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

async function userExists(username) {
    return await databaseConnection.valueInDatabaseExists("users", "username", username);
}

const bcrypt = require("bcryptjs");
async function passwordIsCorrect(password, passwordEntered) {
    return await bcrypt.compare(passwordEntered, password);
}


module.exports = {
    userExists,
    passwordIsCorrect
}