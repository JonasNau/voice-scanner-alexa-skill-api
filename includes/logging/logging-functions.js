const winston = require("winston");
require('winston-daily-rotate-file');
const objectFunctions = require("../object-functions");
const pathFunctions = require("../path-functions");
const dateFunctions = require("../date-functions");
const fileFunctions = require("../file-functions");
const fs = require("node:fs");
const archiver = require("archiver");
const util = require("util");

const levels = {
  error: "error",
  warn: "warn",
  info: "info",
  http: "http",
  verbose: "verbose",
  debug: "debug",
  silly: "silly",
};

const loggingFormats = {
  json: winston.format.json,
  simple: winston.format.simple,
  prettyPrint: winston.format.prettyPrint,
  printf: winston.format.printf,
  logstash: winston.format.logstash,
};


winston.addColors({
    info: 'bold blue', // fontStyle color
    warn: 'italic yellow',
    error: 'bold red',
    debug: 'green',
  });

class MyLogger {
  constructor() {
    this.loggingFolder = process.env["LOGGING_FOLDER"] ?? "./logs";
    this.logToDailyFolder = Boolean(
      objectFunctions.makeJSON(process.env["LOG_TO_DAILY_FOLDER"])
    );

    this.uncaughtExceptionLogger = null;

    this.logger = winston.createLogger({
      transports: [],
      exitOnError: false,
    });
  }

  configureUncaughtExceptionLogger() {
    if (this.logToDailyFolder) {
        this.uncaughtExceptionLogger = winston.createLogger({
            format: winston.format.combine(
              winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSSS" }),
              winston.format.printf((info) => {
                return `\n[${info.timestamp}] [${info.level.toUpperCase()}]: ${
                  info.message
                }`;
              }),
              winston.format.colorize({ all: true })
            ),
            exceptionHandlers: [
              new winston.transports.Console(),
              new winston.transports.File({ filename: `${this.loggingFolder}/${this.getDailyFolderName()}/uncaughtExceptions.log` }),
              new winston.transports.File({ filename: `${this.loggingFolder}/combined.log`}),
            ],
            exitOnError: true
          });
    } else {
        this.uncaughtExceptionLogger = winston.createLogger({
            format: winston.format.combine(
              winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSSS" }),
              winston.format.printf((info) => {
                return `\n[${info.timestamp}] [${info.level.toUpperCase()}]: ${
                  info.message
                }`;
              }),
              winston.format.colorize({ all: true })
            ),
            exceptionHandlers: [
              new winston.transports.Console(),
              new winston.transports.File({ filename: `${this.loggingFolder}/uncaughtExceptions.log` }),
              new winston.transports.File({ filename: `${this.loggingFolder}/combined.log`}),

            ],
            exitOnError: true
          });
    }
    
  }

  logToConsole(message = "LOG: ", level = levels.debug, meta = {}, fromFile = "", logToCombined = true, formatType = winston.format.simple) {
    this.logger.clear();
    this.logger.format = winston.format.combine(
        formatType(),
        winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSSS" }),
        winston.format.printf((info) => {
        if (meta !== null) {
            return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
                info.message
              } \nMETA:\n${util.inspect(meta, {showHidden: false, depth: null, colors: true, maxArrayLength: null, breakLength: 80})}`;
        } 
        return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
            info.message
          }`;
        }),
        winston.format.colorize({ all: true })
      );
    this.logger.level = level;
    this.logger.add(new winston.transports.Console())
    this.logger.log(level, message)

    //Log to combined log
    if (logToCombined) {this.logToCombined(message, level, meta, fromFile, formatType)};
  }

  logToFILE(file = "combined.log", message = "LOG: ", level = levels.info, meta, fromFile = "",  logToCombined = true, formatType = winston.format.simple) {
    this.logger.clear();
    this.logger.format = winston.format.combine(
        formatType(),
        winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSSS" }),
        winston.format.printf((info) => {
        if (meta !== null) {
            return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
                info.message
              } \nMETA:\n${util.inspect(meta, {showHidden: false, depth: null, colors: true, maxArrayLength: null, breakLength: 80})}`;
        } 
        return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
            info.message
          }`;
        }),
        winston.format.colorize({ all: true })
      );
    
    if (this.logToDailyFolder) {
        this.logger.add(new winston.transports.File({ filename: `${this.loggingFolder}/${this.getDailyFolderName()}/${file}` }))
    } else {
        this.logger.add(new winston.transports.File({ filename: `${this.loggingFolder}/${file}` }))
    }
    this.logger.level = level;
    this.logger.log(level, message)
    if (logToCombined) {this.logToCombined(message, level, meta, fromFile, formatType)};
  }

  logToCombined(message = "LOG: ", level = levels.info, meta, fromFile = "", formatType = winston.format.simple) {
    this.logger.clear();
    this.logger.format = winston.format.combine(
        formatType(),
        winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSSS" }),
        winston.format.printf((info) => {
        if (meta !== null) {
            return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
                info.message
              } \nMETA:\n${util.inspect(meta, {showHidden: false, depth: null, colors: true, maxArrayLength: null, breakLength: 80})}`;
        } 
        return `\n[${info.timestamp}]-${fromFile}-[${info.level.toUpperCase()}]: ${
            info.message
          }`;
        }),
        winston.format.colorize({ all: true })
      );
      this.logger.level = level;
      this.logger.add(new winston.transports.File({ filename: `${this.loggingFolder}/combined.log`}))
      this.logger.log(level, message)
  }

  getDailyFolderName() {
    let now = new Date();
    let dailyFolderName =  `${now.toLocaleDateString({year: "numeric", month: "2-digit", day: "2-digit"})}`;
    fileFunctions.makeDirsRecursivelyIfNotExists(`${this.loggingFolder}/${dailyFolderName}/`)
    return dailyFolderName;
  }

  async archiveLogDirectoriesOlderThanXDays() {
    const archiveDirectory = `${process.env["LOGGING_ARCHIVE_FOLDER"]}`;

    let allDirectories = fs.readdirSync(this.loggingFolder).filter(file => {
        let filePath = `${this.loggingFolder}/${file}`;
        return fs.statSync(filePath).isDirectory();
    })

    let now = new Date();
    let olderThanInDays = parseInt(process.env["ZIP_LOGS_OLDER_THAN_IN_DAYS"]);
    let deleteOlderThan = new Date().setTime(now.getTime() - dateFunctions.getMillisecondsFromDays(olderThanInDays));

    let allDirectoriesOlderThanXDays = allDirectories.filter(directory => {
        let filePath = `${this.loggingFolder}/${directory}`;
        let created = new Date(fs.statSync(filePath).birthtime);
        return created < deleteOlderThan;
    });
    if (!allDirectoriesOlderThanXDays.length) {
        this.logToFILE("log-archiver.log", "There are no folders to archive", "info");
        return false;
    }

    fileFunctions.makeDirsRecursivelyIfNotExists(archiveDirectory)

    this.logToFILE("log-archiver.log", "These Folders will be archived:", "info", {meta: [allDirectoriesOlderThanXDays]});
    for(const folderName of allDirectoriesOlderThanXDays) {
        
        const input = `${this.loggingFolder}/${folderName}`;
        const output = fs.createWriteStream(`${archiveDirectory}/${folderName}.zip`)
        const archive = archiver("zip");

        this.logToFILE(`log-archiver.log", "Archiving ${input} to ${output}`, "info");

        archive.pipe(output);
        archive.directory(input, false);
        archive.finalize();

        const waitForFinish = async () => {
            return new Promise(async (resolve, reject) => {
                output.on("close", () => {
                    this.logToFILE("log-archiver.log", `${this.loggingFolder}/${folderName} has been successfully archived to ${output}`, "info");
                    resolve(true)
                })
                archive.on("error", (err) => {
                    this.logToFILE("log-archiver.log", `${this.loggingFolder}/${folderName} could not be archived to ${output}`, "error", {meta: [err]});
                    reject(`${this.loggingFolder}/${folderName} could not be archived to ${output}`);
                })
            })
        }
        await waitForFinish();
        //remove Logs
        fs.rmSync(input, { recursive: true, force: true});
       
    }
  }

  async deleteLogArchivesOlderThanXDays() {
    const archiveDirectory = `${process.env["LOGGING_ARCHIVE_FOLDER"]}`;

    let allFiles = fs.readdirSync(archiveDirectory).filter(file => {
        let filePath = `${archiveDirectory}/${file}`;
        return fs.statSync(filePath);
    })

    let now = new Date();
    let olderThanInDays = parseInt(process.env["DELETE_OLD_ZIP_LOGS_OLDER_THAN_IN_DAYS"]);
    let deleteOlderThan = new Date().setTime(now.getTime() - dateFunctions.getMillisecondsFromDays(olderThanInDays));

    let allFilesOlderThanXDays = allFiles.filter(file => {
        let filePath = `${archiveDirectory}/${file}`;
        let created = new Date(fs.statSync(filePath).birthtime);
        return created < deleteOlderThan;
    });
    if (!allFilesOlderThanXDays.length) {
        this.logToFILE("log-archiver.log", "There are no archives to be deleted", "info");
        return false;
    }
    for (const currentFile of allFilesOlderThanXDays) {
        let filePath = `${archiveDirectory}/${currentFile}`;
        this.logToFILE("log-archiver.log", `Removing ${filePath}`, "info");
        if (!fs.rmSync(filePath, { recursive: true, force: true})) {
            this.logToFILE("log-archiver.log", `Error while removing ${filePath}`, "error");
            continue;
        }
        this.logToFILE("log-archiver.log", `Successfully removed ${filePath}`, "info");
    }
  }


  clearLogsInLogRoot() {
    let allFiles = fs.readdirSync(this.loggingFolder).filter(file => {
        let filePath = `${this.loggingFolder}/${file}`;
        return fs.statSync(filePath).isFile() && file.endsWith(".log");
    })

    for (const currentFile of allFiles) {
        let filePath = `${this.loggingFolder}/${currentFile}`;
        this.logToFILE("log-archiver.log", `Removing ${filePath}`, "info");
        if (!fs.rmSync(filePath, { recursive: true, force: true})) {
            this.logToFILE("log-archiver.log", `Error while removing ${filePath}`, "error");
            continue;
        }
        this.logToFILE("log-archiver.log", `Successfully removed ${filePath}`, "info");


    }
  }


   
}

const myLogger = new MyLogger();
myLogger.configureUncaughtExceptionLogger();
//Create log Folder if it doesn't exist
fileFunctions.makeDirsRecursivelyIfNotExists(myLogger.loggingFolder);


async function clean() {
  await myLogger.archiveLogDirectoriesOlderThanXDays()
  setInterval(() => myLogger.archiveLogDirectoriesOlderThanXDays(), dateFunctions.getMillisecondsFromDays(1))
  await myLogger.deleteLogArchivesOlderThanXDays()
  setInterval(() => myLogger.deleteLogArchivesOlderThanXDays(), dateFunctions.getMillisecondsFromDays(1))
  await myLogger.clearLogsInLogRoot()
  setInterval(() => myLogger.clearLogsInLogRoot(), dateFunctions.getMillisecondsFromDays(1))
}

clean();
//Archive and Delete




module.exports = {
  levels,
  loggingFormats,
  myLogger,
};
