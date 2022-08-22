const {databaseConnection} = require("../database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

const loggingFunctions = require("../logging/logging-functions");
const myLogger = loggingFunctions.myLogger;
const objectFunctions = require("../object-functions");
const pathFunctions = require("../path-functions");
const FILE_NAME = pathFunctions.getNameOfCurrentFile(__filename);


async function getSettingValue(settingName) {
    return await databaseConnection.getValueFromDatabase("settings", "setting", "name", settingName, 1, false);
}


async function setSettingValue(settingName, value) {
    return await databaseConnection.setValueFromDatabase("settings", "setting", "name", settingName, value);
}


async function createSetting(settingName, type = "switch", setting, normalValue, description = null, usedAt = [], min = null, max = null, cratePermission = true, createPermissionObject = {
    ranking: 1,
    normalValueToGrantAccess: true,
}) {
     if (!await databaseConnection.databaseCall(`INSERT INTO "settings" ("name", "type", "setting" "normalValue", "description", "usedAt", "min", "max") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [settingName, type, setting, normalValue, description, usedAt, min, max])) {
        myLogger.logToFILE("settings-functions.log", `Setting '${settingName}' couldn't be created`, "error", null, FILE_NAME);
        return false;
     }
     myLogger.logToFILE("settings-functions.log", `Setting '${settingName}' successfully created`, "info", null, FILE_NAME);
     if (!cratePermission || objectFunctions.emptyVariable(createPermissionObject)) return true
     const permissionFunctions = require("../permissions/permission-functions");
     let permissionName = `SETTING_${settingName}`;
     myLogger.logToFILE("settings-functions.log", `Trying to add permission ${permissionName} to '${settingName}'.`, "info", null, FILE_NAME);
     if (!permissionFunctions.permissionExists(permissionName)) {
        //Create Permission
        permissionFunctions.createPermission(permissionName, `Change Setting ${settingName}`, createPermissionObject.ranking, createPermissionObject.normalValueToGrantAccess)
     }

     databaseConnection.setValueFromDatabase("settings", "permissionNeeded", "name", permissionName, permissionName);

     myLogger.logToFILE("settings-functions.log", `Permission ${permissionName} added to '${settingName}'.`, "info", null, FILE_NAME);

     return true;
}

async function setValueFromSetting(settingName, value) {
    
}

module.exports = {
    getSettingValue,
    setSettingValue
}