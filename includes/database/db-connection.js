//Import Postgres
const { Client, Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

//Import functions
const objectFunctions = require("../object-functions");

class DatabaseConnection {
  constructor() {
    this.postgresPool = null;
  }

  async create() {
    return new Promise(async (resolve, reject) => {
      let postgresPool = new Pool({
        user: "homeAPI_Node",
        password: process.env.DB_PASSWORD,
        host: "192.168.178.110",
        port: "49156",
        database: "homeAPI",
        application_name: "homeAPI_NodeJS",
        max: 5,
        idleTimeoutMillis: 30000,
        statement_timeout: 15000,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });

      postgresPool.on("error", (err, client) => {
        throw new Error("Unexpected error on idle client", { client, err });
      });

      postgresPool.on("acquire", (client) => {
        //console.log("Client was acquired from the pool.");
      });

      postgresPool.on("remove", (client) => {
        //console.log("Client was put into the pool.");
      });
      this.postgresPool = postgresPool;

      if (!(await this.checkConnection())) {
        this.postgresPool = null;
        throw new Error("Connection to database failed.");
      }
      
      console.log("Connection to the database successfully established.");
      resolve(postgresPool);
    });
  }

  checkActive() {
    if (!this.postgresPool) {
      throw new Error("You are not connected to the database.");
    }
    return true;
  }

  async checkConnection() {
    return new Promise(async (resolve, reject) => {
      let clientToCheck;
      try {
        let { client } = await this.getClient({ handleError: true });
        clientToCheck = client;
        client.release();
      } catch (err) {
        if (clientToCheck) clientToCheck.release();
        resolve(false);
      }
      resolve(true);
    });
  }

  async disconnect() {
    return new Promise(async (resolve, reject) => {
      if (!this.checkActive()) {
        resolve(false);
        return;
      }
      this.postgresPool.end(() => {
        this.postgresPool = null;
        console.log(
          "pool has ended",
          "Successfully disconnected from the database"
        );
        resolve(true);
      });
    });
  }

  async getClient(options = null, callback = null) {
    return new Promise((resolve, reject) => {
      if (!this.checkActive()) {
        resolve(false);
        return;
      }
      this.postgresPool.connect((error, client, releaseClient) => {
        if (error && options?.handleError) {
          if (client) client.release();
          throw new Error(error);
        }

        if (typeof callback == "function")
          resolve(callback({ client, error, releaseClient }));
        resolve({ client, error, releaseClient });
      });
    });
  }

  async databaseCall(SQL, valueArray = []) {
    return new Promise(async (resolve, reject) => {
      if (!this.checkActive()) {
        resolve(false);
        return;
      }
      let { client, error, releaseClient } = await this.getClient({
        handleError: true,
      });
      if (!client) {
        console.error("Error while getting client");
        resolve(false);
        return;
      }
      try {
        if (!SQL) {
          console.error("There is an empty SQL statement.");
          resolve(false);
        }

        if (error) {
         throw new Error(error.stack);
          client.release();
          resolve(false);
          return;
        }
        client.query(SQL, valueArray, (error, response) => {
          if (error) {
            client.release();
            throw new Error(error.stack);
            resolve(false);
            return;
          }
          client.release();
          resolve(response);
        });
      } catch (error) {
        console.error("DATABASE_ERROR:", error);
        resolve(false);
      }
    });
  }

  async getValueFromDatabase(
    table,
    column,
    where,
    whereEqualTo,
    limit = 0,
    returnAsArray,
    distinct
  ) {
    if (objectFunctions.emptyVariable(table) || objectFunctions.emptyVariable(column) || objectFunctions.emptyVariable(where) || objectFunctions.emptyVariable(whereEqualTo)) {
      console.error("Error at getValueFromDatabase() -> Some param is not set.", {table, column, where, whereEqualTo});
      return false;
    }
    limit = limit ?? 0;
    limit = parseInt(limit);
    distinct = Boolean(distinct);

    //If returnAsArray is false then it will return the first result
    if (limit > 0) {
      let result = await this.databaseCall(
        `SELECT "${column}" FROM "${table}" WHERE "${where}" = $1 LIMIT $2;`,
        [whereEqualTo, limit]
      );
      if (!result) return false;
      if (!result.rowCount) return false;

      if (returnAsArray) {
        let resultArray = new Array();
        for (const row of result.rows) {
          resultArray = objectFunctions.addToArray(
            resultArray,
            row[column],
            !distinct
          );
        }
        return resultArray;
      } else {
        return result.rows[0]?.[column];
      }
    } else {
      let result = await this.databaseCall(
        `SELECT "${column}" FROM "${table}" WHERE "${where}" = $1;`,
        [whereEqualTo]
      );
      if (!result) return false;
      if (!result.rowCount) return false;

      if (returnAsArray) {
        let resultArray = new Array();
        for (const row of result.rows) {
          resultArray = objectFunctions.addToArray(
            resultArray,
            row[column],
            !distinct
          );
        }
        return resultArray;
      } else {
        return result.rows[0]?.[column];
      }
    }
  }

  async getAllValuesFromDatabase(
    table,
    column,
    limit = 0,
    returnAsArray,
    distinct
  ) {
    if (objectFunctions.emptyVariable(table) || objectFunctions.emptyVariable(column)) {
      console.error("Error at getValueFromDatabase() -> Some param is not set.", {table, column, where, whereEqualTo});
      return false;
    }
    limit = limit ?? 0;
    limit = parseInt(limit);
    distinct = Boolean(distinct);

    //If returnAsArray is false then it will return the first result
    if (limit > 0) {
      let result = await this.databaseCall(
        `SELECT "${column}" FROM "${table}" LIMIT $1;`,
        [limit]
      );
      if (!result) return false;
      if (!result.rowCount) return false;

      if (returnAsArray) {
        let resultArray = new Array();
        for (const row of result.rows) {
          resultArray = objectFunctions.addToArray(
            resultArray,
            row[column],
            !distinct
          );
        }
        return resultArray;
      } else {
        return result.rows[0]?.[column];
      }
    } else {
      let result = await this.databaseCall(
        `SELECT "${column}" FROM "${table}";`,
        []
      );
      if (!result) return false;
      if (!result.rowCount) return false;

      if (returnAsArray) {
        let resultArray = new Array();
        for (const row of result.rows) {
          resultArray = objectFunctions.addToArray(
            resultArray,
            row[column],
            !distinct
          );
        }
        return resultArray;
      } else {
        return result.rows[0]?.[column];
      }
    }
  }

  async valueInDatabaseExists(
    table,
    where,
    whereEqualTo
  ) {
   return await this.getValueFromDatabase(table, where, where, whereEqualTo, 1, false) != false;
  }

  async deleteRowFromDatabase(
    table,
    column,
    whereEqualTo) {
      let result = await this.databaseCall(`DELETE FROM ${table} WHERE ${column} = $1`, [whereEqualTo]);
      return result.rowCount >= 0;
    }

  async setValueFromDatabase(table, column, where, whereEqualTo, newValue) {
    if (objectFunctions.emptyVariable(table) || objectFunctions.emptyVariable(column) || objectFunctions.emptyVariable(where) || objectFunctions.emptyVariable(whereEqualTo)) {
      console.error("Error at setValueFromDatabase() -> Some param is not set.", {table, column, where, whereEqualTo});
      return false;
    }

    let result = await this.databaseCall(
      `UPDATE "${table}" SET "${column}" = $1 WHERE "${where}" = $2;`,
      [newValue, whereEqualTo]
    );
    if (!result) return false;
    if (!result.rowCount) return false;
    return result.rowCount >= 1;
  }

  async addToArrayDatabase(
    table,
    column,
    where,
    whereEqualTo,
    newValue,
    containTwice = true
  ) {
    let array = await this.getValueFromDatabase(
      table,
      column,
      where,
      whereEqualTo,
      1,
      false
    );
    if (typeof array != "object") {
      array = new Array();
    }
    if (!Array.isArray(array)) {
      array = new Array();
      // console.error({array}, "is not an Array (It is an Object), so addToArrayDatabase() was cancelled");
      // return false;
    }
    array = objectFunctions.addToArray(array, newValue, containTwice);
    return await this.setValueFromDatabase(table, column, where, whereEqualTo, JSON.stringify(array));
  }

  async removeFromArrayDatabase(
    table,
    column,
    where,
    whereEqualTo,
    toRemove,
    removeAll = true,
    deepEqual = true,
    removeDirection = "start"
  ) {
    let array = await this.getValueFromDatabase(
      table,
      column,
      where,
      whereEqualTo,
      1,
      false
    );
    if (typeof array != "object") {
      array = [];
    }
    if (!Array.isArray(array)) {
      array = [];
      // console.error({array}, "is not an Array (It is an Object), so removeFromArrayDatabase() was cancelled");
      // return false;
    }

    array = objectFunctions.removeFromArray(array, toRemove, removeAll, deepEqual, removeDirection);
    return await this.setValueFromDatabase(table, column, where, whereEqualTo, JSON.stringify(array));
  }

  async addToObjectDatabase(
    table,
    column,
    where,
    whereEqualTo,
    newKey,
    newValue
  ) {
    let object = await this.getValueFromDatabase(
      table,
      column,
      where,
      whereEqualTo,
      1,
      false
    );
    if (typeof object != "object") {
      object = {};
    }
    if (Array.isArray(object)) {
      object = {};
      // console.error({object}, "is an Array (It is not an Object), so addToObjectDatabase() was cancelled");
      // return false;
    }
    object[newKey] = newValue;
    return await this.setValueFromDatabase(table, column, where, whereEqualTo, JSON.stringify(object));
  }

  async removeFromObjectDatabase(
    table,
    column,
    where,
    whereEqualTo,
    toRemove,
    removeBykeyOrValue = "key",
    deepEqual = true,
    strict = false,

  ) {
    let object = await this.getValueFromDatabase(
      table,
      column,
      where,
      whereEqualTo,
      1,
      false
    );
    if (typeof object != "object") {
      object = {};
    }
    if (Array.isArray(object)) {
      object = {};
      // console.error({object}, "is an Array (It is not an Object), so addToObjectDatabase() was cancelled");
      // return false;
    }
    object = objectFunctions.removeFromObject(object, toRemove, removeBykeyOrValue, strict, deepEqual);
    return await this.setValueFromDatabase(table, column, where, whereEqualTo, JSON.stringify(object));
  }
}

const databaseConnection = new DatabaseConnection();


module.exports = {
  DatabaseConnectionClass: DatabaseConnection,
  databaseConnection: databaseConnection
};
