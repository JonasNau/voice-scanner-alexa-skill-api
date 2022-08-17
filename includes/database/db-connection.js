//Import Postgres
const { Client, Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

module.exports = class DatabaseConnection {
    constructor() {
        this.postgresPool = null;

    }

    async create() {
        let postgresPool = new Pool({
            user: "homeAPI_Node",
            password: process.env.DB_PASSWORD,
            host: "192.168.178.110",
            port: "49153",
            database: "homeAPI",
            application_name: "homeAPI_NodeJS",
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ssl: false
          });

          postgresPool.on("error", (err, client) => {
            console.error('Unexpected error on idle client',{client, err})
            process.exit(-1)
          })

        this.postgresPool = postgresPool;

       if (!await this.checkConnection()) {
        console.error('Connection to database failed.')
        this.postgresPool = null;
       }
    
        return postgresPool;
    }

    async checkConnection() {
        return new Promise(async(resolve, reject) => {
            try {
                await this.getClient({handleError: true})
            } catch (err) {
                resolve(false)
            }
            resolve(true);
        })
    }

    async disconnect() {
        return new Promise(async(resolve, reject) => {
            this.postgresPool.end(() => {
                console.log('pool has ended')
                resolve(true);
              });
        })
        
    }

    async getClient(options = null, callback = null) {
        return new Promise((resolve, reject) => {
            if (!this.postgresPool) {
                reject("You are not connected to the database", "There is no postgres pool available");
            }
            this.postgresPool.connect((error, client, releaseClient) => {
                if (error && options?.handleError) {
                    reject(error);
                }
                if (typeof callback == 'function') resolve(callback({error, client, releaseClient}))
                resolve({client, error, releaseClient})
            });
        })
    }

    async databaseCall(SQL, valueArray = []) {
        return new Promise(async (resolve, reject) => {
            try {
                let {client, error, releaseClient} = await this.getClient();
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
                })
            } catch (error) {
                console.error("DATABASE_ERROR:", error);
                resolve(false);
            }
           
        })
    }
    



}


