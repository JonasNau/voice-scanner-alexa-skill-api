//Import express
const express = require("express");
const app = express();


const {databaseConnection} = require("./includes/database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");



//Import Routs
const authRoute = require("./routs/auth.js");

//Middlewares
app.use(express.json());

//Route Middlewares
app.use("/api/user", authRoute);

app.listen(3000, () => console.log("Up and running"));
