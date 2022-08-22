cd "${0%/*}" #Goto current directory

source ./scanVariables.sh
##removeFiles in scan folder
eval "rm ${SCAN_FOLDER}*"
echo "Files in scan folder removed";