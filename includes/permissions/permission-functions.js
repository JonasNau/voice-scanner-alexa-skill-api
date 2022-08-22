const { databaseConnection } = require("../database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

//Import functions
const objectFunctions = require("../object-functions");
const loggingFunctions = require("../logging/logging-functions");
const myLogger = loggingFunctions.myLogger;
const pathFunctions = require("../path-functions");
const FILE_NAME = pathFunctions.getNameOfCurrentFile(__filename);

async function userHasPermissions(uuid, permissionsNeeded = {}, checkWithRanking = false) {
    if (!uuid) return false;
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

                if (await getPermissionGroup(currentGroup, currentPermissionKey) === currentPermissionValue) {
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
    if (!groupName) return false;
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
    if (objectFunctions.emptyVariable(allPermissionsUser[permissionName])) return null;
    return allPermissionsUser[permissionName];
}

async function getPermissionGroup(groupName, permissionName, allPermissionsGroup = null) {
    if (!groupName) return false;

    allPermissionsGroup = (!objectFunctions.emptyVariable(allPermissionsGroup) && (objectFunctions.isObject(allPermissionsGroup) || allPermissionsGroup === false)) ?  allPermissionsGroup : await databaseConnection.getValueFromDatabase("groups", "permissions", "name", groupName, 1, false);
    if (!allPermissionsGroup) return false;
   
    if (objectFunctions.emptyVariable(allPermissionsGroup[permissionName])) return undefined;
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

async function addPermisionUser(uuid, permissionName, permissionValue) {
    if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.addToObjectDatabase("users", "permissions", "uuid", uuid, permissionName, permissionValue);
}

async function addForbiddenPermissionUser(uuid, permissionName) {
    if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.addToArrayDatabase("users", "isForbiddenTo", "uuid", uuid, permissionName, false);
}

async function removePermisionUser(uuid, permissionName) {
    if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.removeFromObjectDatabase("users", "permissions", "uuid", uuid, permissionName, "key", true);
}

async function removeForbiddenPermisionUser(uuid, permissionName) {
    if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.removeFromArrayDatabase("users", "isForbiddenTo", "uuid", uuid, permissionName, true, true);
}


async function addPermisionGroup(groupName, permissionName, permissionValue) {
    //if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.addToObjectDatabase("groups", "permissions", "name", groupName, permissionName, permissionValue);
}

async function addForbiddenPermissionGroup(groupName, permissionName) {
    //if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.addToArrayDatabase("groups", "isForbiddenTo", "name", groupName, permissionName, false);
}

async function removePermisionGroup(groupName, permissionName) {
    //if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.removeFromObjectDatabase("groups", "permissions", "name", groupName, permissionName, "key", true);
}

async function removeForbiddenPermisionGroup(groupName, permissionName) {
    //if (!await permissionExists(permissionName)) return false;
    return await databaseConnection.removeFromArrayDatabase("groups", "isForbiddenTo", "name", groupName, permissionName, true, true);
}

async function addGroupUser(uuid, groupName) {
    if (await userHasGroup(uuid, groupName)) return false;
    return await databaseConnection.addToArrayDatabase("users", "groups", "uuid", uuid, groupName, false);
}

async function removeGroupUser(uuid, groupName) {
    if (!await userHasGroup(uuid, groupName)) return false;
    return await databaseConnection.removeFromArrayDatabase("users", "groups", "uuid", uuid, groupName, true);
}

async function createGroup(groupName, description = "") {
    if (await groupExists(groupName)) return false;
    return await databaseConnection.databaseCall(`INSERT INTO "groups" ("name", "description") VALUES ($1, $2);`, [groupName, description]);
}

async function deleteGroup(groupName) {
    if (!await groupExists(groupName)) return false;

    //Delete group
   if (!await databaseConnection.deleteRowFromDatabase("groups", "name", groupName)) {
    console.error(`Group '${groupName}' couldn't be deleted.`);
    return;
   }

    //Remove it from every user
    const allUsersUUIDs = await databaseConnection.getAllValuesFromDatabase("users", "uuid", false, false);
    if (allUsersUUIDs && allUsersUUIDs.length) {
        for (const currentUserUUID of allUsersUUIDs) {
            await removeGroupUser(currentUserUUID, groupName);
        }
        
    }
    myLogger.logToFILE("permission-functions.log", `Group '${groupName}' successfully deleted.`, "info", null, FROM_FILE);
}

async function changeGroupName(groupName, newName) {
    if (!await groupExists(groupName)) return false;

    //Change Name from group
   if (!await databaseConnection.setValueFromDatabase("groups", "name", "name", groupName, newName)) {
    myLogger.logToFILE("permission-functions.log", `Group '${groupName}' couldn't be renamed.`, "error", null, FROM_FILE);
    return;
   }

    //Remove it from every user
    const allUsersUUIDs = await databaseConnection.getAllValuesFromDatabase("users", "uuid", false, false);
    if (allUsersUUIDs && allUsersUUIDs.length) {
        for (const currentUserUUID of allUsersUUIDs) {
            if (await userHasGroup(currentUserUUID, groupName)) {
                myLogger.logToFILE("permission-functions.log", `Group '${groupName}' will be removed from '${currentUserUUID}'.`, "info", null, FROM_FILE);
                if (!await removeGroupUser(currentUserUUID, groupName)) {
                    myLogger.logToFILE("permission-functions.log",`Group '${groupName}' couldn't be removed From User '${currentUserUUID}'.`, "error", null, FROM_FILE);
                    continue;
                }
                    myLogger.logToFILE("permission-functions.log", `Group '${groupName}' successfully removed from user '${currentUserUUID}'.`, "info", null, FROM_FILE);


                if (!await addGroupUser(currentUserUUID, newName)) {
                    myLogger.logToFILE("permission-functions.log", `Group '${newName}' couldn't be added to User '${currentUserUUID}'.`, "error", null, FROM_FILE);
                    continue
                } 
                    myLogger.logToFILE("permission-functions.log", `Group '${groupName}' successfully added to user '${currentUserUUID}'.`, "info", null, FROM_FILE);
            }
            
            
        }
        
    }

    myLogger.logToFILE("permission-functions.log", `Group '${groupName}' successfully renamed to ${newName}.`, "info", null, FROM_FILE);
}

async function createPermission(permissionName, description, ranking, normalValueToGrantAccess, usedAtEndpoints = {}) {
    if (await permissionExists(permissionName)) return false;
    return await databaseConnection.databaseCall(`INSERT INTO "permissions" ("name", "description", "ranking", "normalValueToGrantAccess", "usedAtEndpoints") VALUES ($1, $2, $3, $4, $5);`, [permissionName, description, ranking, normalValueToGrantAccess, JSON.stringify(usedAtEndpoints)]);
}

async function deletePermission(permissionName) {
    if (!await permissionExists(groupName)) return false;

    //Delete permission
   if (!await databaseConnection.deleteRowFromDatabase("permissions", "name", permissionName)) {
    myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' couldn't be deleted.`, "error", null, FROM_FILE);
    return;
   }

    //Remove it from every user
    const allUsersUUIDs = await databaseConnection.getAllValuesFromDatabase("users", "uuid", false, false);
    if (allUsersUUIDs && allUsersUUIDs.length) {
        for (const currentUserUUID of allUsersUUIDs) {
            if (!await removePermisionUser(currentUserUUID, permissionName) || !await removeForbiddenPermisionUser(currentUserUUID, permissionName)) {
                myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' couldn't be removed properly from USER ${currentUserUUID}.`, "error", null, FROM_FILE);
            }
        }
        
    }

    //Remove it from every group
    const allGroups = await databaseConnection.getAllValuesFromDatabase("groups", "name", false, false);
    if (allGroups && allGroups.length) {
        for (const currentGroup of allGroups) {
            if (!await removePermisionGroup(currentGroup, permissionName) || !await removeForbiddenPermisionGroup(currentGroup, permissionName)) {
                myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' couldn't be removed properly from GROUP ${currentGroup}.`, "error", null, FROM_FILE);
            }
        }
        
    }

    myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' successfully deleted.`, "info", null, FROM_FILE);
}

async function changePermissionName(permissionName, newName) {
    if (!await permissionExists(groupName)) return false;

    //Rename Permission
   if (!await databaseConnection.setValueFromDatabase("permissions", "name", "name", permissionName, newName)) {
    myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' couldn't be renamed to ${newName}.`, "error", null, FROM_FILE);
    return;
   }

    //Remove it from every user
    const allUsersUUIDs = await databaseConnection.getAllValuesFromDatabase("users", "uuid", false, false);
    if (allUsersUUIDs && allUsersUUIDs.length) {
        for (const currentUserUUID of allUsersUUIDs) {
            if (!objectFunctions.emptyVariable(await getPermissionUser(currentUserUUID, permissionName))) {
                const permissionValue = await getPermissionUser(currentUserUUID, permissionName);
                if (await addPermisionUser(currentUserUUID, newName, permissionValue)) {
                    myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' at USER '${currentUserUUID}' was renamed to '${newName} with the value of`, "info", {permissionValue}, FROM_FILE);
                } else {
                    myLogger.logToFILE("permission-functions.log", `Permission '${permissionName}' at USER '${currentUserUUID}' couldn't be renamed to '${newName} with the value of`, "error", {permissionValue}, FROM_FILE);
                }
            }
            await removePermisionUser(currentUserUUID, permissionName); //Remove the key even if the value is null or undefined

            if (await userIsForbiddenTo(currentUserUUID, permissionName)) {
                if (await addForbiddenPermissionUser(currentUserUUID, newName)) {
                    myLogger.logToFILE("permission-functions.log", `Forbidden-Permission '${permissionName}' at USER '${currentUserUUID}' was renamed to '${newName} with the value of`, "info", null, FROM_FILE);
                } else {
                    myLogger.logToFILE("permission-functions.log", `Forbidden-Permission '${permissionName}' at USER '${currentUserUUID}' couldn't be renamed to '${newName} with the value of`, "error", null, FROM_FILE);
                }
                await removeForbiddenPermisionUser(currentUserUUID, permissionName) // Remove from List in any case
            }
           
        }
        
    }

    //Remove it from every group
    const allGroups = await databaseConnection.getAllValuesFromDatabase("groups", "name", false, false);
    if (allGroups && allGroups.length) {
        for (const currentGroup of allGroups) {
            if (await groupIsForbiddenTo(currentGroup, permissionName)) {
                if (await addForbiddenPermissionGroup(currentGroup, newName)) {
                    myLogger.logToFILE("permission-functions.log", `Forbidden-Permission '${permissionName}' at GROUP '${currentUserUUID}' was renamed to '${newName} with the value of`, "info", null, FROM_FILE);
                } else {
                    myLogger.logToFILE("permission-functions.log", `Forbidden-Permission '${permissionName}' at GROUP '${currentUserUUID}' couldn't be renamed to '${newName} with the value of`, "error", null, FROM_FILE);
                }
                await removeForbiddenPermisionGroup(currentGroup, permissionName) // Remove from List in any case
            }
        }
        
    }

    myLogger.logToFILE("permission-functions.log", `Forbidden-Permission '${permissionName}' successfully renamed to ${newName}.`, "info", null, FROM_FILE);
}

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
    //GETTERS AND SETTERS
    addPermisionUser,
    addForbiddenPermissionUser,
    removePermisionUser,
    removeForbiddenPermisionUser,
    addPermisionGroup,
    addForbiddenPermissionGroup,
    removePermisionGroup,
    removeForbiddenPermisionGroup,
    createGroup,
    addGroupUser,
    removeGroupUser,
    deleteGroup,
    changeGroupName,
    createPermission,
    deletePermission,
    changePermissionName,

}