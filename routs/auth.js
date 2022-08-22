const router = require("express").Router();

const { databaseConnection, DatabaseConnectionClass } = require("../includes/database/db-connection");
if (!databaseConnection.checkActive())
  throw new Error("Database connection is not active");


//Import functions
const objectFunctions = require("../includes/object-functions");
const settingsFunctions = require("../includes/settings/settings-functions");
const authenticationFunctions = require("../includes/authentication/authentication-functions");
const permissionFunctions = require("../includes/permissions/permission-functions");
const dateFunctions = require("../includes/date-functions");
//LOGGING
const loggingFunctions = require("../includes/logging/logging-functions");
const myLogger = loggingFunctions.myLogger;
const pathFunctions = require("../includes/path-functions");
const FILE_NAME = pathFunctions.getNameOfCurrentFile(__filename);


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
  if (!objectFunctions.emptyVariable(validation.value?.expire) || !dateFunctions.makeDate(validation.value?.expire)) {
    expires = new Date(validation.value.expire);
    if (expires <= now) {
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

  const uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  let hashedPasswordDB = await databaseConnection.getValueFromDatabase("users", "password", "uuid", uuid, 1, false);

  if (!await permissionFunctions.userHasPermissions(uuid, ["canLogin"])) {
    myLogger.logToFILE("auth.log", `The user with the uuid '${uuid}' tried to login, but he / she is not allowed to.`, "info");
    response.status(400).json({error: true, message: "You are not allowed to login"});
    return;
  }

  if (!await authenticationFunctions.passwordIsCorrect(hashedPasswordDB, validation.value.password)) {
    myLogger.logToFILE("auth.log", `The user with the uuid '${uuid}' tried to login, but the password was wrong.`, "info");
    response.status(401).json({error: true, message: "Wrong password."})
    return;
  }

  let userdata = await databaseConnection.databaseCall(`SELECT "userID", "uuid", "username", "password", "created", "lastLogin", "lastPwdChange", "groups", "permissions", "isForbiddenTo", "expires" FROM users WHERE uuid = $1`, [uuid]);
  const jwtToken = jwt.sign(userdata.rows[0], process.env.JWT_TOKEN_SECRET)


  if (!await databaseConnection.databaseCall(`INSERT INTO "auth_tokens" ("jsonwebtoken", "uuid", "created", "expires", "usecase") VALUES ($1, $2, $3, $4, $5);`, [jwtToken, uuid, new Date().toString(), expires?.toString(), validation.value.usecase])) {
    response.status(500).json({error: true, message: "Error while creating your jwt-token"})
    return;
  }
  myLogger.logToFILE("auth.log", `The user with the uuid '${uuid}' successfully logged in and got the token '${jwtToken}'`, "info");
  response.status(200).json({error: false, message: "Successfully created a jwt-token. Now you can login with it.", token: jwtToken})
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
    response.status(400).json({error: true, message:"This token doesn't exist!"});
    return;
  }

  if (!await databaseConnection.deleteRowFromDatabase("auth_tokens", "jsonwebtoken", validation.value.jsonwebtoken)) {
    response.status(400).json({error: true, message:"Could not log out jwt-token"});
    return;
  }

  myLogger.logToFILE("auth.log", `The token '${validation.value.jsonwebtoken}' successfully logged out. (deleted)'${jwtToken}'`, "info");
  response.status(200).json({error: false, message: "Successfully logged out and deleted that token."});
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

  const uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  let hashedPasswordDB = await databaseConnection.getValueFromDatabase("users", "password", "uuid", uuid, 1, false);


  if (!await authenticationFunctions.passwordIsCorrect(hashedPasswordDB, validation.value.password)) {
    response.status(401).json({error: true, message: "Wrong password."})
    return;
  }

  if (!await databaseConnection.deleteRowFromDatabase("auth_tokens", "uuid", uuid)) {
    response.status(400).json({error: true, message:"Could not log out jwt-tokens"});
    return;
  }

  myLogger.logToFILE("auth.log", `The user with the uuid '${uuid}' successfully logged out all tokens (deleted)'${jwtToken}'`, "info");
  response.status(200).json({error: false, message: "Successfully logged out all tokens. (deleted)"});
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

  
  const uuid = await databaseConnection.getValueFromDatabase("users", "uuid", "username", validation.value.username, 1, false)
  //Check if user has permissions to delete Password

  if (!await permissionFunctions.userHasPermissions(uuid, ["canResetPassword"])) {
    myLogger.logToFILE("auth.log", `The user with the uuid '${uuid}' tried to reset the password but has no permissions to do so.`, "info");
    response.status(403).json({error: true, message: "You have not the permissions to reset your password."});
    return;
  }
  

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(validation.value.password, salt);

  if (!await databaseConnection.setValueFromDatabase("users", "password", "uuid", uuid, hashedPassword)) {
    myLogger.logToFILE("auth.log", `Resetting the password form user with the uuid '${uuid}' failed due to an internal error.`, "error");
    response.status(500).json({error: true, message: "Password couldn't be reset due to an internal error."})
    return;
  }

  myLogger.logToFILE("auth.log", `Resetting the password form user with the uuid '${uuid}' was successfull.`, "info");
  await permissionFunctions.removePermisionUser(uuid, "canResetPassword");
  response.status(200).json({error: false, message: "Successfully changed password. Now you can't do it again because your permission was removed for that."});
});


//Export the router
module.exports = router;
