const {databaseConnection} = require("../database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");


async function getSettingValue(settingName) {
    return await databaseConnection.getValueFromDatabase("settings", "setting", "name", settingName, 1, false);
}


async function setSettingValue(settingName, value) {
    return await databaseConnection.setValueFromDatabase("settings", "setting", "name", settingName, value);
}


async function createSetting() {

}

async function setValueFromSetting(settingName, value) {
    
}

module.exports = {
    getSettingValue,
    setSettingValue
}