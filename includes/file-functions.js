const fs = require('node:fs')

function makeDirsRecursivelyIfNotExists(dir) {
    if (!fs.existsSync(dir)){
        let oldUmask = process.umask(0);
        fs.mkdirSync(dir, { recursive: true });
        process.umask(oldUmask)
    }
}

module.exports = {
    makeDirsRecursivelyIfNotExists
}