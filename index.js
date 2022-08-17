//Import express
const express = require("express");
const app = express();


const DatabaseConnection = require("./includes/database/db-connection");

const databaseConnection = new DatabaseConnection();




async function dbCall() {
    if (!await databaseConnection.create()) return;

    //console.log(await databaseConnection.databaseCall("SELECT NOW()", []));
    // for (let i = 0; i < 100; i++) {
    //     await databaseConnection.databaseCall("INSERT INTO users (name) VALUES ($1)", [i.toString()]);
    // }

    // let result = await databaseConnection.databaseCall("TRUNCATE users", []);
    // if (!result) return;
    // console.log(result);

    databaseConnection.disconnect();
}

dbCall();





//Import Routs
const authRoute = require("./routs/auth.js");

//Route Middlewares
app.use("/api/user", authRoute);

app.listen(3000, () => console.log("Up and running"));
