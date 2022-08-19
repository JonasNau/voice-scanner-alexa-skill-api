//Import express
const express = require("express");
const app = express();


console.log(typeof new Array())
//Import functions
const objectFunctions = require("./includes/object-functions");


const {databaseConnection} = require("./includes/database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");


async function run() {
    console.log(await databaseConnection.getValueFromDatabase("users", "password", "name", "Test11", false, true));

    await databaseConnection.setValueFromDatabase("users", "password", "name", "Test11", "This is a super secure password");
   
    addToArrayDatabase
}   

run();


//Import Routs
const authRoute = require("./routs/auth.js");

//Middlewares
app.use(express.json());

//Route Middlewares
app.use("/api/user", authRoute);

app.listen(3000, () => console.log("Up and running"));
