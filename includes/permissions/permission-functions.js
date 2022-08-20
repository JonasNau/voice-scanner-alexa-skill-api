const { databaseConnection } = require("../database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

//Import functions
const objectFunctions = require("../object-functions");

async function userHasPermissions(uuid, permissionsNeeded = {}, checkWithRanking = false) {
    let permissionsLeft = [];
    const usersPermissions = await databaseConnection.getValueFromDatabase("users", "permissions", "uuid", uuid, 1, false);
    const usersGroups = await databaseConnection.getValueFromDatabase("users", "groups", "uuid", uuid, 1, false);


    if (objectFunctions.isArray(permissionsNeeded)) {
        let newobject = {};
        for (const currentPermission of permissionsNeeded) {
            newobject[currentPermission] = await GNVP(currentPermission);
        }
        permissionsNeeded = newobject;
    }

    if (!objectFunctions.isObject(permissionsNeeded)) {
        throw new Error("Cannot check for permissions because the permissionsNeeded variable is not an object");
        return false;
    }

    for (const [currentPermissionKey, currentPermissionValue] of Object.entries(permissionsNeeded)) {
        permissionsLeft = objectFunctions.addToArray(permissionsLeft, currentPermissionKey, false);

        //Check if the current permission exists
        if (!await permissionExists(currentPermissionKey)) {
            console.error(`Couldn't find permission ${currentPermissionKey}, so the user with the uuid of ${uuid} is allowed to access.`);
            permissionsLeft = objectFunctions.removeFromArray(permissionsLeft, currentPermissionKey, true, false);
            continue;
        }

        //Check if user is forbidden to
        if (await userIsForbiddenTo(uuid, [currentPermissionKey])) {
            return false;
        }

        //Seperate checks if user has groups or not because what if the group has the permission but the user don't? Then it will say that the user hasn't the permission
        if (usersGroups && objectFunctions.isArray(usersGroups) && usersGroups.length) {
            //User has some groups
            for (const currentGroup of usersGroups) {
                //Group is forbidden to
                if (await groupIsForbiddenTo(currentGroup, [currentPermissionKey])) return false;
                //Group has permissions
                if (await getPermissionGroup(currentGroup, [currentPermissionKey] === currentPermissionValue)) {
                    permissionsLeft = objectFunctions.removeFromArray(permissionsLeft, currentPermissionKey, true, false);
                    continue;
                }
                //User has permissions
                if (await getPermissionUser(uuid, currentPermissionKey, usersPermissions) === currentPermissionValue) {
                    permissionsLeft = objectFunctions.removeFromArray(permissionsLeft, currentPermissionKey, true, false);
                    continue;
                }
            }
        } else {
            if (await getPermissionUser(uuid, currentPermissionKey, usersPermissions) === currentPermissionValue) {
                permissionsLeft = objectFunctions.removeFromArray(permissionsLeft, currentPermissionKey, true, false);
                continue;
            }
        }
    }

    if (permissionsLeft.length === 0) {
        return true;
    } else if (checkWithRanking) {
        let permissionRankingNumber = await getRankingFromPermissionsList(Object.keys(permissionsNeeded));
        if (await userHasPermissionRanking(uuid, permissionRankingNumber)) return true;
    }

    return false;
}


async function groupHasPermissions(currentGroup, permissionsNeeded = {}, checkWithRanking = false) {

    let permissionsLeft = [];

    for (const [currentPermissionKey, currentPermissionValue] of Object.entries(permissionsNeeded)) {
     //Group is forbidden to
     if (await groupIsForbiddenTo(currentGroup, [currentPermissionKey])) return false;
     //Group has permissions
     if (await getPermissionGroup(currentGroup, [currentPermissionKey] === currentPermissionValue)) {
         permissionsLeft = objectFunctions.removeFromArray(permissionsLeft, currentPermissionKey, true, false);
         return true;
     }
    }

    if (permissionsLeft.length === 0) {
        return true;
    } else if (checkWithRanking) {
        let permissionRankingNumber = await getRankingFromPermissionsList(Object.keys(permissionsNeeded));
        if (groupHasPermissionRanking(groupName, permissionRankingNumber)) return true;
    }
    return false;
}


async function userHasPermissionRanking(uuid, numberNeeded) {
      let permissionRankingUser = await getPermissionRankingUser(uuid);
      if (permissionRankingUser < numberNeeded) return false;
      return true;
}

async function groupHasPermissionRanking(groupName, numberNeeded) {
    let permissionRankingGroup = await getPermissionRankingGroup(groupName);
    if (permissionRankingGroup < numberNeeded) return false;
    return true;
}

async function userIsForbiddenTo(uuid, forbiddenArray = [], allForbiddenPermissionsUser = null) {
    if (!uuid) return false;
    if (!objectFunctions.isArray(forbiddenArray)) return false;
    if (!forbiddenArray.length) return false;

    allForbiddenPermissionsUser = (!objectFunctions.emptyVariable(allForbiddenPermissionsUser) && (objectFunctions.isArray(allForbiddenPermissionsUser) || allForbiddenPermissionsUser === false)) ?  allForbiddenPermissionsUser : await databaseConnection.getValueFromDatabase("users", "isForbiddenTo", "uuid", uuid, 1, false);
    if (!allForbiddenPermissionsUser) return false;
    for (const currentCheckForbidden of forbiddenArray) {
        if (allForbiddenPermissionsUser.some(currentForbidden => {return currentForbidden == currentCheckForbidden})) {
            return true;
        }
    }

    return false;
}

async function groupIsForbiddenTo(groupName, forbiddenArray = [], allForbiddenPermissionsGroup) {
    if (!uuid) return false;
    if (!objectFunctions.isArray(forbiddenArray)) return false;
    if (!forbiddenArray.length) return false;

    allForbiddenPermissionsGroup = (!objectFunctions.emptyVariable(allForbiddenPermissionsGroup) && (objectFunctions.isArray(allForbiddenPermissionsGroup) || allForbiddenPermissionsGroup === false)) ?  allForbiddenPermissionsGroup : await databaseConnection.getValueFromDatabase("groups", "isForbiddenTo", "name", groupName, 1, false);
    if (!allForbiddenPermissionsGroup) return false;
    for (const currentCheckForbidden of forbiddenArray) {
        if (allForbiddenPermissionsGroup.some(currentForbidden => {return currentForbidden == currentCheckForbidden})) {
            return true;
        }
    }

    return false;
}

async function getPermissionUser(uuid, permissionName, allPermissionsUser = null) {
    if (!uuid) return false;

    allPermissionsUser = (!objectFunctions.emptyVariable(allPermissionsUser) && (objectFunctions.isObject(allPermissionsUser) || allPermissionsUser === false)) ?  allPermissionsUser : await databaseConnection.getValueFromDatabase("users", "permissions", "uuid", uuid, 1, false);
    if (!allPermissionsUser) return false;
    if (objectFunctions.emptyVariable(allPermissionsUser[permissionName])) return false;
    return allPermissionsUser[permissionName];
}

async function getPermissionGroup(groupName, permissionName, allPermissionsGroup = null) {
    if (!groupName) return false;

    allPermissionsGroup = (!objectFunctions.emptyVariable(allPermissionsGroup) && (objectFunctions.isObject(allPermissionsGroup) || allPermissionsGroup === false)) ?  allPermissionsGroup : await databaseConnection.getValueFromDatabase("groups", "permissions", "name", groupName, 1, false);
    if (!allPermissionsGroup) return false;
    if (objectFunctions.emptyVariable(allPermissionsGroup[permissionName])) return false;
    return allPermissionsGroup[permissionName];
}


async function userHasGroup(uuid, groupName) {
    const allGroupsUser = await databaseConnection.getValueFromDatabase("users", "groups", "uuid", uuid, 1, false);
    if (!allGroupsUser || !objectFunctions.object_length(allGroupsUser)) return false;
    return allGroupsUser.includes(groupName);
}


async function getRankingFromPermissionsList(permissionsList = []) {
    let permissionRanking = 0;
    for (const currentPermisson of permissionsList) {
        if (!permissionExists(currentPermisson)) continue;
        let currentPermissonRanking = parseInt(await databaseConnection.getValueFromDatabase("permissions", "ranking", "name", currentPermisson, 1, false))
        if (currentPermissonRanking > permissionRanking) permissionRanking = currentPermissonRanking;
    }
    return permissionRanking;
}

async function getPermissionRankingUser(uuid) {
    let permissionRanking = 0;

    const usersGroups = databaseConnection.getValueFromDatabase("users", "groups", "uuid", uuid, 1, false);
    //From Groups
    if (usersGroups && objectFunctions.isArray(usersGroups) && usersGroups.length) {
        for (const currentGroup of usersGroups) {
            let currentPermissionRanking = parseInt(await getPermissionRankingGroup(currentGroup));
            if (currentPermissionRanking > permissionRanking) permissionRanking = currentPermissionRanking;
        }
    }
    //From User
    const allAvailablePermissions = await databaseConnection.getAllValuesFromDatabase("permissions", "name", false, true, true);
    if (allAvailablePermissions && objectFunctions.isArray(allAvailablePermissions) && allAvailablePermissions.length) {
        for (const currentPermission of allAvailablePermissions) {
            if (await userHasPermissions(uuid, {[currentPermission]: await GNVP(currentPermission)}, false)) {
                let currentPermissionRanking = parseInt(await databaseConnection.getValueFromDatabase("permissions", "ranking", "name", currentPermission, 1, false));
                if (currentPermissionRanking > permissionRanking) permissionRanking = currentPermissionRanking;
            }
        }
    }
    return permissionRanking;
}

async function getPermissionRankingGroup(groupName) {
    let permissionRanking = 0;

    const allAvailablePermissions = await databaseConnection.getAllValuesFromDatabase("permissions", "name", false, true, true);
    if (allAvailablePermissions && objectFunctions.isArray(allAvailablePermissions) && allAvailablePermissions.length) {
        for (const currentPermission of allAvailablePermissions) {
            if (await groupHasPermissions(groupName, {[currentPermission]: await GNVP(currentPermission)}, false)) {
                let currentPermissionRanking = parseInt(await databaseConnection.getValueFromDatabase("permissions", "ranking", "name", currentPermission, 1, false));
                if (currentPermissionRanking > permissionRanking) permissionRanking = currentPermissionRanking;
            }
        }
    }
    return permissionRanking;
}

async function groupExists(groupName) {
    return await databaseConnection.valueInDatabaseExists("groups", "name", groupName);
}

async function permissionExists(permissionName) {
    return await databaseConnection.valueInDatabaseExists("permissions", "name", permissionName);
}

async function GNVP(permissionName) {
    //Get normal Value to grant access permission
    return await databaseConnection.getValueFromDatabase("permissions", "normalValueToGrantAccess", "name", permissionName, 1, false);
}


//GETTERS and SETTERS



module.exports = {
    userHasPermissions,
    groupHasPermissions,
    userHasPermissionRanking,
    groupHasPermissionRanking,
    userIsForbiddenTo,
    groupIsForbiddenTo,
    getPermissionUser,
    getPermissionGroup,
    userHasGroup,
    getRankingFromPermissionsList,
    getPermissionRankingUser,
    getPermissionRankingGroup,
    groupExists,
    permissionExists,

}