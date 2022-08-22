const router = require("express").Router();
//Import Validation functions
const Joi = require("@hapi/joi");

const { databaseConnection } = require("../../includes/database/db-connection");
if (!databaseConnection.checkActive())
  throw new Error("Database connection is not active");

  const loggingFunctions = require("../../includes/logging/logging-functions");
  const myLogger = loggingFunctions.myLogger;
  const pathFunctions = require("../../includes/path-functions");
  const FILE_NAME = pathFunctions.getNameOfCurrentFile(__filename);


const { auth } = require("../../includes/authentication/authentication-functions");

  router.get("/", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    response.status(200).json({error: false, message: "Welcome to voiceScanner!", routs: ["/init", "/stopScan", "/addPage", "/convertAndUpload"]});
  });

  router.get("/init", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    await voiceScanner.init();
    response.status(200).json({error: false, message: "Initialized voiceScanner! Start scanning with '/addPage'"});
  });

  router.get("/addPage", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let result = await voiceScanner.scanImage();
    if (!result.error) {
        response.status(200).json({error: false, message: "Page Scanned!"});
    } else {
        response.status(500).json({error: true, message: "An error occurred while Scanning!", result, numberOfPages: await voiceScanner.getNumberOfPages()});
    }
  });


  router.get("/convertAndUpload", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let schema = Joi.object({
        filename: Joi.string().required(),
        extension: Joi.string().required()
      })
    let validation = schema.validate(request.body);
    if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
    }
    let result = await voiceScanner.convertAndUpload(validation.value.filename, validation.value.extension);
    if (!result.error) {
        response.status(200).json({error: false, message: "File is convered and uploaded successfully!"});
    } else {
        response.status(500).json({error: true, message: "An error occurred while scanning or uploading!", result});
    }
  });

  router.get("/numberOfPages", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let numberOfPages = await voiceScanner.getNumberOfPages();
    response.status(200).json({error: false, numberOfPages});
  });

  const cp = require('child_process');
class VoiceScanner {
    constructor() {
        this.isScanning = false;
        this.currentState = "waiting for init";
        this.fileExtensions = ["pdf", "png", "jpg"];
        this.pathToScripts = "./bashFiles";
        this.currentScript;
    }

    async runBashScript(pathToScript, args = "") {
        return new Promise(async (resolve, reject) => {
            this.currentScript = cp.exec(`bash ${__dirname}/${pathToScript} ${args}`, (error, stdout, stderr) => {
                myLogger.logToFILE("voiceScanner.log", `Script ${pathToScript} OUTPUT:`, "info", {stdout, stderr, error}, FILE_NAME);
                resolve({stdout, stderr, error})
            });
        })
    }

    killCurrentProccess() {
        return this.currentScript.kill();
    }


    async init() {
        this.currentState = "initialized";
        await this.runBashScript(`${this.pathToScripts}/removeFilesInScanFolder.sh`);
    }

    async scanImage() {
        if (this.currentState != "initialized" && this.currentState != "ready") {
            return {error: true, message: "Scanner is not initialized or is not ready"}
        }
        if (this.isScanning === true) {return {error: true, message: "Scanner is working... Please wait!"}}
        myLogger.logToFILE("voiceScanner.log", `Scanning Page...`, "info", this.currentState, FILE_NAME);
        this.isScanning = true;
        let result = await this.runBashScript(`${this.pathToScripts}/scanImage.sh`);
        this.currentState = "ready";
        this.isScanning = false;
        return result;
    }

    async convertAndUpload(filename, extension) {
        if (!filename || !extension) {
            return {error: true, message: "Filename or extension is not specified."}
        }
        if (!this.fileExtensions.includes(extension)) {
            return {error: true, message: `The extension ${extension} is not supported.`}
        }
        myLogger.logToFILE("voiceScanner.log", `Scanning Page...`, "info", this.currentState, FILE_NAME);
        let result =  await this.runBashScript(`${this.pathToScripts}/convertAndUpload.sh`, `"${filename}" "${extension}"`);
        await this.clear();
        return result;
    }

    async clear() {
        await this.init()
    }

    async getNumberOfPages() {
        let result = await this.runBashScript(`${this.pathToScripts}/getNumberOfPages.sh`);
        if (!result.error) {
            return parseInt(result.stdout);
        }
        return false;
    }
}

const voiceScanner = new VoiceScanner();

//Export the router
module.exports = router;