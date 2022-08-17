const router = require('express').Router();

router.post("/register", (reqest, response) => {
    response.send("Register");
})


// router.post("/login", (reqest, response) => {
//     res.send("Login");
// })

module.exports = router;