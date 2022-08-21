const path = require('path');

function getNameOfCurrentFile(filename = __filename) {
    return path.basename(filename)
}

module.exports = {
    getNameOfCurrentFile
}