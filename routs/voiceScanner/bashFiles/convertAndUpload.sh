#!/bin/bash
cd "${0%/*}" #Goto current directory

source ./scanVariables.sh
source ./convertVariables.sh
source ./functions.sh


FINAL_FILE_NAME=$1;
echo "Die Datei(en) wird ${FINAL_FILE_NAME} heißen";
CONVERTED_IMAGE_EXTENSION=".$2"

if [[ ! "${fileExtenstions[*]}" =~ "${CONVERTED_IMAGE_EXTENSION}" ]] || [ -z $CONVERTED_IMAGE_EXTENSION ];
then
    echo "There is no file extension specified or the extension is not supported"
    exit 1
fi


#Convert and upload
if [ $CONVERTED_IMAGE_EXTENSION = ".pdf" ]
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
    echo $files
    for img in $files; do
        nameOfCurrentFile=$(basename "${img}");
        log "Konvertiere: ${img}${nameOfCurrentFile}${SCANNED_IMAGE_EXTENSION}";
        eval "convert '${img}' '${CONVERTED_FOLDER}${nameOfCurrentFile}${CONVERTED_IMAGE_EXTENSION}'"
        #Move to NAS
        FINAL_FILE_NAME=$(createUniqueFileName "${FILE_DESTINATION}" "${FINAL_FILE_NAME}" "${CONVERTED_IMAGE_EXTENSION}")
        log "Verschiebe: ${nameOfCurrentFile}";
        eval "mv -f '${CONVERTED_FOLDER}${nameOfCurrentFile}${CONVERTED_IMAGE_EXTENSION}' '${FILE_DESTINATION}${FINAL_FILE_NAME}${CONVERTED_IMAGE_EXTENSION}'";
    done
    
fi

#clean Scanned folder and converted folder
eval "rm ${SCAN_FOLDER}*"
eval "rm ${CONVERTED_FOLDER}*"

echo "Scan was successfully created."