cd "${0%/*}" #Goto current directory

source ./scanVariables.sh
#source ./convertVariables.sh
echo $(ls ${SCAN_FOLDER} | wc -l)