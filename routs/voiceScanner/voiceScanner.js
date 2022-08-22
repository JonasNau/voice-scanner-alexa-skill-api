const router = require("express").Router();


const { databaseConnection } = require("../../includes/database/db-connection");
if (!databaseConnection.checkActive())
  throw new Error("Database connection is not active");

const { auth } = require("../../includes/authentication/authentication-functions");

  router.get("/", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
   
    response.status(200).json({message: "Welcome to voiceScanner!", routs: ["/startScan", "/stopScan", "/addPage", "/nameFile", "/setExtension", ]});
  });



class VoiceScanner {
    
}

//Export the router
module.exports = router;