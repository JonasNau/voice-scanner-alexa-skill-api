const { array } = require("@hapi/joi");
const { databaseConnection } = require("../includes/database/db-connection");
if (!databaseConnection.checkActive())
  throw new Error("Database connection is not active");


function getSettingValue(settingName) {
    let result = databaseConnection.databaseCall("SELECT setting FROM settings WHERE name = $1")
}