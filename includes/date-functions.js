function isExpired(dateToCheck, now = new Date()) {
    if (!dateToCheck instanceof Date) {
        dateToCheck = makeDate(dateToCheck);
        if (!dateToCheck) return true;
    }

    if (!now instanceof Date) {
        now = makeDate(now);
        if (!now) return true;
    }

    if (now < dateToCheck) return true;
    return false;
}


function makeDate(date) {
    if (!canBeConvertedToDate(date)) return false;
    return new Date(date);
}

function canBeConvertedToDate(date) {
    if (!date instanceof Date) {
        try {
            new Date(date);
        } catch (e) {
            return false;
        }
    }
    return true;
}

function getMillisecondsFromDays(days) {
    return 1000 * 60 * 60 * 24 * days;
}

module.exports = {
    isExpired,
    makeDate,
    canBeConvertedToDate,
    getMillisecondsFromDays
}