//Import Postgres
const { Client, Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

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
            database: "homeAPI_Test",
            application_name: "homeAPI_NodeJS",
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ssl: false,
          });
      
          console.log(Array.from(postgresPool["_clients"]));
      
          postgresPool.on("error", (err, client) => {
            console.error("Unexpected error on idle client", { client, err });
            process.exit(-1);
          });
      
          postgresPool.on("acquire", (client) => {
            console.log("Client was acquired from the pool.");
          });
      
          postgresPool.on("remove", (client) => {
            console.log("Client was put into the pool.");
          });
      
          this.postgresPool = postgresPool;
      
          if (!await this.checkConnection()) {
            console.error("Connection to database failed.");
            this.postgresPool = null;
            resolve(false);
          }
      
          resolve(postgresPool);
    })
    
  }

  checkActive() {
    if (!this.postgresPool) {
        console.error("You are not connected to the database.");
        return false;};
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
    if (!this.checkActive()) {resolve(false); return};
      this.postgresPool.end(() => {
        this.postgresPool = null;
        console.log("pool has ended", "Successfully disconnected from the database");
        resolve(true);
      });
    });
  }

  async getClient(options = null, callback = null) {
    return new Promise((resolve, reject) => {
        if (!this.checkActive()) {resolve(false); return};
      this.postgresPool.connect((error, client, releaseClient) => {
            if (error && options?.handleError) {
                if (client) client.release();
                console.error(error)
                resolve(false);
              }

        if (typeof callback == "function")
          resolve(callback({ client, error, releaseClient }));
        resolve({ client, error, releaseClient });
      });
    });
  }

  async databaseCall(SQL, valueArray = []) {
    return new Promise(async (resolve, reject) => {
        if (!this.checkActive()) {resolve(false); return};
    let { client, error, releaseClient } = await this.getClient({handleError: true});
    if (!client) {
        console.error("Error while getting client");
        resolve(false);
        return;
    }
      try {
        if (!SQL) {
            console.error("There is an empty SQL statement.");
            resolve(false)
        }

        if (error) {
          console.error(error.stack);
          client.release();
          resolve(false);
          return;
        }
        client.query(SQL, valueArray, (error, response) => {
          if (error) {
            console.error(error.stack);
            client.release();
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
};

const databaseConnection = new DatabaseConnection();

async function connectToDB() {
  if (!await databaseConnection.create()) {
      return false;
  }

  //console.log(await databaseConnection.databaseCall("SELECT NOW()", []));
  // for (let i = 0; i < 100; i++) {
  //     await databaseConnection.databaseCall("INSERT INTO users (name) VALUES ($1)", [i.toString()]);
  // }

  // let result = await databaseConnection.databaseCall("TRUNCATE users", []);
  // if (!result) return;
  // console.log(result);
}

connectToDB();



module.exports = {
  "DatabaseConnectionClass": DatabaseConnection,
  "databaseConnection": databaseConnection
}