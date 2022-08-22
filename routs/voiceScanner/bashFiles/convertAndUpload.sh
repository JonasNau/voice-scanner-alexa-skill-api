cd "${0%/*}" #Goto current directory

source ./convertVariables.sh
source ./functions.sh


FINAL_FILE_NAME=$1;
echo "Die Datei(en) wird ${FINAL_FILE_NAME} heißen";
extension=$2;

if [ ! "${fileExtenstions[*]}" =~ "${extension}" ]] || [ -z $extension ];
then
    echo "There is no file extension specified or the extension is not supported"
    exit 1
fi

#Convert and upload
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