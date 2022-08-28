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
  const objectFunctions = require("../../includes/object-functions");


const { auth } = require("../../includes/authentication/authentication-functions");

  router.post("/", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    response.status(200).json({error: false, message: "Welcome to voiceScanner!", routs: ["/init", "/stopScan", "/addPage", "/convertAndUpload"]});
  });

  router.post("/init", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/init was called`, "info", voiceScanner.currentState, FILE_NAME);
    let result = await voiceScanner.init(true);
    if (!result.error) {
        response.status(200).json({error: false, message: "Scanner wurde erfolgreich inizialisiert."});
    } else {
        response.status(500).json({error: true, message: "Ein Fehler ist beim Inizialisieren aufgetreten. Prüfe, ob der Drucker eingeschalt und mit dem Netzwerk verbunden ist.", data: result});
    }
  });


  router.post("/initAsync", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/init was called`, "info", voiceScanner.currentState, FILE_NAME);
    let result = await voiceScanner.init(false);
    if (!result.error) {
        response.status(200).json({error: false, message: "Scanner wurde erfolgreich inizialisiert."});
    } else {
        response.status(500).json({error: true, message: "Ein Fehler ist beim Inizialisieren aufgetreten. Prüfe, ob der Drucker eingeschalt und mit dem Netzwerk verbunden ist.", data: result});
    }
  });

  router.post("/clear", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let result = await voiceScanner.clear();
    if (!result.error) {
        response.status(200).json({error: false, message: "Scanner und Dateien wurden zurückgesetzt. Nun kannst du wieder mit dem Scannen beginnen."});
    } else {
        response.status(500).json({error: false, message: "Ein Fehler beim zurücksetzen ist aufgetreten. Bitte versuche es erneut."});
    }
  });

  router.post("/addPage", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/addPage was called`, "info", voiceScanner.currentState, FILE_NAME);
    let result = await voiceScanner.scanImage();
    if (!result.error && result.stderr == "") {
        response.status(200).json({error: false, message: "Seite erfolgreich hinzugefügt.", numberOfPages: await voiceScanner.getNumberOfPages()});
    } else {
        response.status(500).json({error: true, message: "Ein Fehler beim Scannen ist aufgetreten. Bitte versuche es erneut.", result});
    }
  });

  router.post("/addPageAsync", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/addPageAsync was called`, "info", voiceScanner.currentState, FILE_NAME);
    if (!voiceScanner.isAbleToScan()) {
        
        response.status(500).json({error: true, message: "Ein Fehler beim Scannen ist aufgetreten. Der Scanner ist nicht bereit. Bitte versuche es erneut.", result});
        return;
    }
    voiceScanner.scanImage();
    let numberOfPages = await voiceScanner.getNumberOfPages() + 1;
    response.status(200).json({error: false, message: `${numberOfPages}. Seite erfolgreich hinzugefügt.`, numberOfPages});
        

  });

  router.post("/kill", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    voiceScanner.killCurrentProccess();
    await voiceScanner.init(false);
    response.status(200).json({error: false, message: "Scanner wurde erfolgreich gestoppt und ist wieder einsatzbereit."});
  });


  router.post("/convertAndUpload", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let schema = Joi.object({
        filename: Joi.string().required(),
        extension: Joi.string().required()
      })
    let validation = schema.validate(request.body);
    if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json(validation.error);
    return;
    }

    let inputCheck = voiceScanner.checkFilenameAndExtension(validation.value.filename, validation.value.extension);
    if (inputCheck.error) {
        response.status(500).json({error: true, message: `Die Dateierweiterung ${validation.value.extension} wird nicht unterstützt.`, result});
        return;
    }

    let isAbleToConverAndUploadFiles = await voiceScanner.isAbleToConverAndUploadFiles(validation.value.filename, validation.value.extension);
    if (isAbleToConverAndUploadFiles) {
        voiceScanner.convertAndUpload(validation.value.filename, validation.value.extension)
        response.status(200).json({error: false, message: "File is convered and uploaded successfully!"});
        return;
    } else {
        response.status(500).json({error: true, message: "An error occurred while scanning or uploading!", result});
        return;
    }

   
  });

  router.post("/convertAndUploadAsync", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/convertAndUploadAsync was called`, "info", request.body, FILE_NAME);
    let schema = Joi.object({
        filename: Joi.string().required(),
        extension: Joi.string().required()
      })
    let validation = schema.validate(request.body);
    if (!objectFunctions.emptyVariable(validation.error)) {
    response.status(400).json({error: true, message: "Es gab einen Fehler beim Überprüfen des Dateinamens oder der Dateiendung."});
    return;
    }
   
    if (await voiceScanner.isAbleToConverAndUploadFiles()) {
        voiceScanner.convertAndUpload(validation.value.filename, validation.value.extension);
        response.status(200).json({error: false, message: "Dateien wurden erfolgreich auf den Server hochgeladen."});
        return;
    } else {
        response.status(500).json({error: true, message: "Es gibt keine Datei zum hochladen.!", result});
        return;
    }
  });

  router.post("/numberOfPages", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    let numberOfPages = await voiceScanner.getNumberOfPages();
    response.status(200).json({error: false, numberOfPages});
  });

  router.post("/status", (request, response, next) => { auth(request, response, ["ACCESS_ROUTE_voiceScanner"], next)}, async (request, response) => {
    myLogger.logToFILE("voiceScanner.log", `/status was called`, "info", {error: false, numberOfPages: await voiceScanner.getNumberOfPages(), isScanning: voiceScanner.isScanning, currentState: voiceScanner.currentState}, FILE_NAME);
    response.status(200).json({error: false, numberOfPages: await voiceScanner.getNumberOfPages(), isScanning: voiceScanner.isScanning, currentState: voiceScanner.currentState});
  });

  const cp = require('child_process');
class VoiceScanner {
    constructor() {
        this.isScanning = false;
        this.currentState = "waiting for init";
        this.fileExtensions = ["pdf", "png", "jpg"];
        this.pathToScripts = "./bashFiles";
        this.currentScript = null;
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
        return this.currentScript?.kill?.();
    }


    async init(checkIfScannerIsOnline = true) {
        if (checkIfScannerIsOnline) {
            if (!await this.scannerIsOnline()) {
                return {error: true, message: "Scanner is offline"}
            }
        }
       
        this.currentState = "initialized";
        this.isScanning = false;
        return await this.runBashScript(`${this.pathToScripts}/removeFilesInScanFolder.sh`);
    }

    isAbleToScan() {
        if (this.currentState != "initialized" && this.currentState != "ready") {
            return false;
        }
        if (this.isScanning === true) return false;
        return true;
    }

    async isAbleToConverAndUploadFiles() {
        if (!await this.getNumberOfPages()) {
            return false;
        }
        return true;
    }

    checkFilenameAndExtension() {
        if (!filename || !extension) {
            return {error: true, message: "Dateiname oder Erweiterung nicht angegeben."}
        }
        if (!this.fileExtensions.includes(extension)) {
            return {error: true, message: `Die Erweiterung ${extension} wird nicht unterstützt.`}
        }
        return {error: false}
    }

    async scanImage() {
        myLogger.logToFILE("voiceScanner.log", `Scanner status:`, "info", this.currentState, FILE_NAME);
        if (this.currentState != "initialized" && this.currentState != "ready") {
            return {error: true, message: "Scanner is not initialized or is not ready"}
        }
        if (this.isScanning === true) {return {error: true, message: "Scanner is working... Please wait!"}}
        myLogger.logToFILE("voiceScanner.log", `Scanning Page...`, "info", this.currentState, FILE_NAME);
        this.isScanning = true;
        this.currentState = "scanning";
        let result = await this.runBashScript(`${this.pathToScripts}/scanImage.sh`);
        this.currentState = "ready";
        this.isScanning = false;
        return result;
    }

    async convertAndUpload(filename, extension) {
        if (!await this.getNumberOfPages()) {
            return {error: true, message: "There are no files to convert."}
        }
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

    async scannerIsOnline() {
        let result = await this.runBashScript(`${this.pathToScripts}/checkScannerOnline.sh`);
        myLogger.logToFILE("voiceScanner.log", `Scanner status:`, "info", result, FILE_NAME);
        if (result.error) return false;
        if (result.stderr != "") return false;
        if (result.stdout == "") return false;
        return true;
    }

    async clear() {
        return await this.init(false)
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