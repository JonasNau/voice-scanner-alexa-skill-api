const router = require('express').Router();

const {databaseConnection} = require("../includes/database/db-connection");
if (!databaseConnection.checkActive()) throw new Error("Database connection is not active");

router.post("/register", async (request, response) => {
    await databaseConnection.databaseCall("INSERT INTO users (name, password) VALUES($1, $2)", [request.body.name, request.body.password]);
    let result = await databaseConnection.databaseCall("SELECT * FROM users WHERE name = $1", [request.body.name]);

    response.json(result.rows[0]);
})


// router.post("/login", (reqest, response) => {
//     res.send("Login");
// })

module.exports = router;