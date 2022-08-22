#!/bin/bash
exec 3>&1
log ()
{
    echo "$1" 1>&3
}

echo "Starting VoiceScanner...";

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


askUser() {
    message=$1;

     read -p "${message} (Y/N)" yn
    case $yn in
        [Yy]* )
        
        echo "yes"
        ;;
        [Nn]* ) 

        echo "no"
        ;;
        * ) 

        echo "Bitte Y oder N eingeben"
        ;;
    esac
}

#Scan
SCANNER_NAME="airscan:e0:EPSON ET-4750 Series"
SCAN_FOLDER="/home/pi/Documents/VoiceScanner/Scanned/"
SCANNED_IMAGE_FILENAME="scannedImage"
SCANNED_IMAGE_EXTENSION=".ppm"

##removeFiles in scan folder
echo "${SCAN_FOLDER}*"
eval "rm ${SCAN_FOLDER}*"

echo "Scanninng with $SCANNER_NAME"

scanImage() {
    UNIQUE_FILE_NAME=$(createUniqueFileName $SCAN_FOLDER $SCANNED_IMAGE_FILENAME $SCANNED_IMAGE_EXTENSION)
    log "Scanning...";
    scanimage -d "${SCANNER_NAME}" > "${SCAN_FOLDER}${UNIQUE_FILE_NAME}${SCANNED_IMAGE_EXTENSION}"
    log "Scanning finished";
}

scanImage

while [ "$(askUser "Möchtest du eine weitere Seite hinzufügen?")" = "yes" ]
do
    scanImage
done;


#Convert
CONVERTED_FOLDER="/home/pi/Documents/VoiceScanner/Converted/"
CONVERTED_IMAGE_FILENAME="scannedImage";
CONVERTED_IMAGE_EXTENSION=".pdf"

fileExtenstions=(".png", ".pdf", ".jpg");

FINAL_FILE_NAME=""

#Datei benennen
read -p "Wie soll die Datei heßen?: " filename

if [ ! -z "${filename}" ]
then
    FINAL_FILE_NAME=$filename;
else
    FINAL_FILE_NAME=$(date '+%Y-%m-%d %H-%M-%S')
fi


echo "Die Datei(en) wird ${FINAL_FILE_NAME} heißen";

printFileExtenstions() {
    for currentExtension in ${fileExtenstions[@]}; do
        echo $currentExtension
    done
}

#Dateiendung auswählen
echo "Welche Dateiendung möchtest du für die Datei?"
printFileExtenstions
extension=""

#While there is an empty extension or an invalid extension get users extension
while [[ ! "${fileExtenstions[*]}" =~ "${extension}" ]] || [ -z $extension ]
do
read -p "Dateiendung: " extension
#Check users Input and tell user to enter it again
if [[ ! "${fileExtenstions[*]}" =~ "${extension}" ]]; then echo "Dateiendung nicht gültig! Bitte erneut eingeben"; printFileExtenstions; fi
done



if [ ! -z $extension ]
then
    CONVERTED_IMAGE_EXTENSION=$extension;
else
    CONVERTED_IMAGE_EXTENSION=".pdf"
fi


FILE_DESTINATION="/mnt/Wuschelcloud_Dateien/Dokumente/Scans/VoiceScanner/"

if [ $extension = ".pdf" ]
then
    #pdf
    files=( $(eval "ls -tr ${SCAN_FOLDER}*${SCANNED_IMAGE_EXTENSION}") )
    #convert all image files to one pdf file
    convert "${files[@]}" "${CONVERTED_FOLDER}${CONVERTED_IMAGE_FILENAME}${CONVERTED_IMAGE_EXTENSION}"
    UNIQUE_FILE_NAME_TO_CONVERT=$(createUniqueFileName $CONVERTED_FOLDER $CONVERTED_IMAGE_FILENAME-toConvert $CONVERTED_IMAGE_EXTENSION)
    mv "${CONVERTED_FOLDER}${CONVERTED_IMAGE_FILENAME}${CONVERTED_IMAGE_EXTENSION}" "${CONVERTED_FOLDER}${UNIQUE_FILE_NAME_TO_CONVERT}${CONVERTED_IMAGE_EXTENSION}"

    #shrink
    UNIQUE_FILE_NAME_AFTER_CONVERT=$(createUniqueFileName $CONVERTED_FOLDER $CONVERTED_IMAGE_FILENAME $CONVERTED_IMAGE_EXTENSION)
    gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer \ -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${CONVERTED_FOLDER}"${UNIQUE_FILE_NAME_AFTER_CONVERT}"${CONVERTED_IMAGE_EXTENSION}" "${CONVERTED_FOLDER}${UNIQUE_FILE_NAME_TO_CONVERT}${CONVERTED_IMAGE_EXTENSION}"

    #Move to NAS
    FINAL_FILE_NAME=$(createUniqueFileName "${FILE_DESTINATION}" "${FINAL_FILE_NAME}" "${CONVERTED_IMAGE_EXTENSION}")
    eval "mv -f '${CONVERTED_FOLDER}${CONVERTED_IMAGE_FILENAME}${CONVERTED_IMAGE_EXTENSION}' '${FILE_DESTINATION}${FINAL_FILE_NAME}${CONVERTED_IMAGE_EXTENSION}'"

else

    files=( $(eval "ls -tr ${SCAN_FOLDER}*${SCANNED_IMAGE_EXTENSION}") )

    for img in files; do
        nameOfCurrentFile=$(basename "${img}");
        log "Konvertiere: ${nameOfCurrentFile}";
        eval "convert '${img}' '${CONVERTED_FOLDER}${nameOfCurrentFile}${extension}'"
        #Move to NAS
        FINAL_FILE_NAME=$(createUniqueFileName "${FILE_DESTINATION}" "${FINAL_FILE_NAME}" "${CONVERTED_IMAGE_EXTENSION}")
        log "Verschiebe: ${nameOfCurrentFile}";
        eval "mv -f '${CONVERTED_FOLDER}${nameOfCurrentFile}${extension}' '${FILE_DESTINATION}${FINAL_FILE_NAME}${CONVERTED_IMAGE_EXTENSION}'";
    done
    
fi


#clean Scanned folder and converted folder
eval "rm ${SCAN_FOLDER}*"
eval "rm ${CONVERTED_FOLDER}*"


echo "Scan was successfully created."

