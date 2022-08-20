const router = require("express").Router();

const { databaseConnection, DatabaseConnectionClass } = require("../includes/database/db-connection");
if (!databaseConnection.checkActive())
  throw new Error("Database connection is not active");


//Import functions
const objectFunctions = require("../includes/object-functions");
const settingsFunctions = require("../includes/settings/settings-functions");
const authenticationFunctions = require("../includes/authentication/authentication-functions");

const jwt = require("jsonwebtoken");


//Import Validation functions
const Joi = require("@hapi/joi");
//Import bcrypt
const bcrypt = require("bcryptjs");

router.post("/register", async (request, response) => {
  if (!await settingsFunctions.getSettingValue("usersCanSignUp")) {
    response.status(403).send("Signing up is currently disabled.");
    return;
  }

  //Validate input
  let userSchema = Joi.object({
    username: Joi.string().min(2).max(64).required(),
    password: Joi.string().min(5).max(256).required()
  })
  let validation = userSchema.validate(request.body);
  if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
  }

  if (await authenticationFunctions.userExists(validation.value.username)) {
    response
      .status(403)
      .json({ errorMessage: "There is already a user with that username" });
    return;
  }

  //Create User
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(validation.value.password, salt);
  
  if (!await databaseConnection.databaseCall(
    "INSERT INTO users (username, password, created) VALUES($1, $2, $3)",
    [validation.value.username, hashedPassword, new Date().toString()]
  )) {
    response.status(500).send("An error occurred while creating the user");
    return;
  }
  let user = await databaseConnection.databaseCall(
    "SELECT * FROM users WHERE username = $1",
    [validation.value.username]
  );

  response.status(201).json({message: "Successfully signed up", userData:  user.rows});
});

router.post("/login", async (request, response) => {
  if (!await settingsFunctions.getSettingValue("usersCanLogin")) {
    response.status(403).json({error: true, message: "Signing up is currently disabled"});
    return;
  }

  let loginSchema = Joi.object({
    username: Joi.string().min(2).max(64).required(),
    password: Joi.string().required(),
    usecase: Joi.string().required(),
    expire: Joi.date()
  })

  let validation = loginSchema.validate(request.body);
  if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
  }

  let now = new Date();
  let expires;
  if (!objectFunctions.emptyVariable(validation.value.expire)) {
    expires = new Date(validation.value.expire);
    if (expires.getTime() <= now.getTime()) {
      response.status(400).json({error: true, message: "The expire time is in the past."})
      return;
    }
  } else {
    expires = false;
  }

  

 

  if (!await authenticationFunctions.userExists(validation.value.username)) {
    response.status(400).json({error: true, message: "This user doesnt exist."})
    return;
  }

  let uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  let hashedPasswordDB = await databaseConnection.getValueFromDatabase("users", "password", "uuid", uuid, 1, false);


  if (!await authenticationFunctions.passwordIsCorrect(hashedPasswordDB, validation.value.password)) {
    response.status(401).json({error: true, message: "Wrong password."})
    return;
  }

  let userdata = await databaseConnection.databaseCall(`SELECT "userID", "uuid", "username", "password", "created", "lastLogin", "lastPwdChange", "groups", "permissions", "isForbiddenTo", "expires" FROM users WHERE uuid = $1`, [uuid]);
  const jwtToken = jwt.sign(userdata.rows[0], process.env.TOKEN_SECRET)


  if (!await databaseConnection.databaseCall(`INSERT INTO "auth_tokens" ("jsonwebtoken", "uuid", "created", "expires", "usecase") VALUES ($1, $2, $3, $4, $5);`, [jwtToken, uuid, new Date().toString(), expires?.toString(), validation.value.usecase])) {
    response.status(500).json({error: true, message: "Error while creating your jwt-token"})
    return;
  }

  response.status(200).json({error: false, message: "Successfully created a jwt-token", token: jwtToken})
});

router.post("/logout", async (request, response) => {
  let logoutSchema = Joi.object({
    jsonwebtoken: Joi.string()
  })

  let validation = logoutSchema.validate(request.body);
  if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
  }

  if (!await databaseConnection.valueInDatabaseExists("auth_tokens", "jsonwebtoken", validation.value.jsonwebtoken)) {
    response.status(400).json({error: true, message:"This token is not valid"});
    return;
  }

  if (!await databaseConnection.deleteRowFromDatabase("auth_tokens", "jsonwebtoken", validation.value.jsonwebtoken)) {
    response.status(400).json({error: true, message:"Could not log out jwt-token"});
    return;
  }

  response.status(200).json({error: false, message: "Successfully logged out that token."});
});

router.post("/logoutall", async (request, response) => {
  let logoutallSchema = Joi.object({
    username: Joi.string().min(2).max(64).required(),
    password: Joi.string().required()
  })

  let validation = logoutallSchema.validate(request.body);
  if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
  }

  if (!await authenticationFunctions.userExists(validation.value.username)) {
    response.status(400).json({error: true, message: "This user doesnt exist."})
    return;
  }

  let uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  let hashedPasswordDB = await databaseConnection.getValueFromDatabase("users", "password", "uuid", uuid, 1, false);


  if (!await authenticationFunctions.passwordIsCorrect(hashedPasswordDB, validation.value.password)) {
    response.status(401).json({error: true, message: "Wrong password."})
    return;
  }

  if (!await databaseConnection.deleteRowFromDatabase("auth_tokens", "uuid", uuid)) {
    response.status(400).json({error: true, message:"Could not log out jwt-tokens"});
    return;
  }

  response.status(200).json({error: false, message: "Successfully logged out all tokens."});
});


router.post("/resetPassword", async (request, response) => {
  if (!await settingsFunctions.getSettingValue("passwordResetIsEnabled")) {
    response.status(403).json({error: true, message: "Signing up is currently disabled"});
    return;
  }


  let resetPasswordSchema = Joi.object({
    username: Joi.string().min(2).max(64).required(),
    password: Joi.string().min(5).max(256).required(),
    password_confirmation: Joi.any().valid(Joi.ref('password')).required().options({ language: { any: { allowOnly: 'must match password' } } })
  })

  let validation = resetPasswordSchema.validate(request.body);
  if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
  }

  if (!await authenticationFunctions.userExists(validation.value.username)) {
    response.status(400).json({error: true, message: "This user doesnt exist."})
    return;
  }

  
  let uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  //Check if user has permissions to delete Password
  

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(validation.value.password, salt);

  if (!await databaseConnection.setValueFromDatabase("users", "password", "uuid", uuid, hashedPassword)) {
    response.status(500).json({error: true, message: "Password couldn't be reset due to an internal error."})
  }

  response.status(200).json({error: false, message: "Successfully changed password"});
});


//Export the router
module.exports = router;
