exec 3>&1
log ()
{
    echo "$1" 1>&3
}

createUniqueFileName() {
    PATH=$1;
    FILENAME=$2;
    EXTENSION=$3;

    counter=$((1));
    UNIQUE_FILE_NAME="${FILENAME}"

    

    while [ -f "${PATH}${UNIQUE_FILE_NAME}${EXTENSION}" ]
    do
         counter=$((counter + 1));
         log "${PATH}${UNIQUE_FILE_NAME}${EXTENSION} exists";
         UNIQUE_FILE_NAME="${FILENAME}-${counter}";
         log "Trying if ${PATH}${UNIQUE_FILE_NAME}${EXTENSION} exists...";
    done;
    log "Using ${PATH}${UNIQUE_FILE_NAME}${EXTENSION}";
    echo $UNIQUE_FILE_NAME;
}

scanImage() {
    UNIQUE_FILE_NAME=$(createUniqueFileName $SCAN_FOLDER $SCANNED_IMAGE_FILENAME $SCANNED_IMAGE_EXTENSION)
    log "Scanning...";
    scanimage -d "${SCANNER_NAME}" > "${SCAN_FOLDER}${UNIQUE_FILE_NAME}${SCANNED_IMAGE_EXTENSION}"
    log "Scanning finished";
}

makeFolderRecursive() {
    path=$1
    mkdir -p "${path}"
}

getDailyFolderName() {
    echo $(date '+%d-%m-%Y')
}