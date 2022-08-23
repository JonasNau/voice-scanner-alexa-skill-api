//Array Functions
function addToArray(array = new Array(), value, includeMultiple = false) {
  if (!array || emptyVariable(value)) return array;

  if (includeMultiple) {
    array.push(value);
  } else {
    if (!arrayIncludesValue(array, value)) {
      array.push(value);
    }
  }
  return array;
}

function arrayIncludesValue(array, value) {
  if (typeof array != typeof new Array()) return false;
  if (array.includes(value)) {
    return true;
  }
  return false;
}

function removeFromArray(
  array,
  value,
  removeAll = true,
  checkForDeepObjects = false,
  removeDirection = "start"
) {
  if (!removeAll) {
    if ((removeDirection = "start")) {
      array.shift(value);
    } else {
      //from end
      array.pop(value);
    }
    return array;
  }
  return array.filter(function (ele) {
    if (checkForDeepObjects) return !Object_deepEqual(ele, value); //Delete all Objects or arrays which are deep equal to the value that has to be removed
    return ele != value;
  });
}

function toggleValuesInArray(array, ...values) {
  if (!array) return array;
  if (!values) return array;
  for (const currentValue of values) {
    if (arrayIncludesValue(array, currentValue)) {
      array = removeFromArray(array, currentValue);
    } else {
      array = addToArray(array, currentValue, false);
    }
  }
  return array;
}

function copyArray(arrayInput) {
  return [...arrayOutput];
}

function deepCopyObject(object) {
  return makeJSON(JSON.stringify(object));
}

function arrayIncludesAllValues(array, values = [], strictMode = false) {
  return values.every((searchFor) => array.includes(searchFor));
}

//Objects

function removeFromObject(
  object,
  toRemove,
  removeBykeyOrValue = "key",
  strict = false,
  deepEqual = false
) {
  if (removeBykeyOrValue == "key") {
    if (!isObject(object)) return object;
    for (const { key, value } of object) {
      if (strict) {
        if (
          key === toRemove ||
          (() => {
            if (deepEqual) {
              return Object_deepEqual(key, toRemove);
            }
            return false;
          })()
        ) {
          if (isNaN(parseInt(key))) delete object[key];
          else object.splice(key, 1);
        }
      } else {
        if (
          key == toRemove ||
          (() => {
            if (deepEqual) {
              return Object_deepEqual(key, toRemove);
            }
            return false;
          })()
        ) {
          if (isNaN(parseInt(key))) delete object[key];
          else object.splice(key, 1);
        }
      }
    }
  } else if (removeBykeyOrValue == "value") {
    for (const { key, value } of object) {
      if (strict) {
        if (
          value === toRemove ||
          (() => {
            if (deepEqual) {
              return Object_deepEqual(value, toRemove);
            }
            return false;
          })()
        ) {
          if (isNaN(parseInt(key))) delete object[key];
          else object.splice(key, 1);
        }
      } else {
        if (
          value == toRemove ||
          (() => {
            if (deepEqual) {
              return Object_deepEqual(value, toRemove);
            }
            return false;
          })()
        ) {
          if (isNaN(parseInt(key))) delete object[key];
          else object.splice(key, 1);
        }
      }
    }
  }
  return object;
}

function object_HasAllConditions(conditions = {}, object = {}) {
  if (!conditions) return true;

  for (const { currentWhereKey, currentWhereValue } of conditions) {
    if (empty(currentWhereKey)) return false;

    if (strictMode) {
      if (typeof object[currentWhereKey] == "object") {
        if (!Object_deepEqual(object[currentWhereKey], currentWhereValue))
          return false;
      } else {
        if (object[currentWhereKey] !== currentWhereValue) return false;
      }
    } else {
      if (typeof object[currentWhereKey] == "object") {
        if (!Object_deepEqual(object[currentWhereKey], currentWhereValue))
          return false;
      } else {
        if (object[currentWhereKey] != currentWhereValue) return false;
      }
    }
  }
}

function Object_deepEqual(x, y) {
  const ok = Object.keys,
    tx = typeof x,
    ty = typeof y;
  return x && y && tx === "object" && tx === ty
    ? ok(x).length === ok(y).length &&
        ok(x).every((key) => Object_deepEqual(x[key], y[key]))
    : x === y;
}

function removeItemFromObject(object, key) {
  if (!typeof object === "object") return object;
  if (!object.hasOwnProperty(key)) return;
  if (isNaN(parseInt(key)) || !(this instanceof Array)) delete object[key];
  else object.splice(key, 1);
}


function object_length(object) {
  if (!object) return 0;
  if (object instanceof Array) return object.length;
  if (object instanceof Object) return Object.keys(object).length;
  return 0;
}

function shuffleArray(array) {
  if (!array) return array;
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    array.shuffle()[
      // And swap it with the current element.
      (array[currentIndex], array[randomIndex])
    ] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

//Null and undefined check
function emptyVariable(input) {
  if (input === null || input === undefined) {
    return true;
  }
  return false;
}

function isArray(tocheck) {
  return tocheck instanceof Array;
}

function isObject(tocheck) {
  return tocheck instanceof Object;
}

//Json
function makeJSON(string) {
  if (typeof json === 'object') {
    return string;
  }
  try {
    if (!isValidJSON(string)) {
      return false;
    } else {
      let json = string;

      while (typeof json == "string" && isValidJSON(json)) {
        json = JSON.parse(json);
      }
      return json;
    }
  } catch (e) {
    return false;
  }
}

function isValidJSON(json) {
  if (IsJsonString(json)) {
    return true;
  }
  if (isJSON_Object(json)) {
    return true;
  }
  if (typeof json === 'object') {
    return true;
  }
  return false;
}

function isJSON_Object(data) {
  try {
    JSON.stringify(data);
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

module.exports = {
  addToArray,
  arrayIncludesValue,
  removeFromArray,
  toggleValuesInArray,
  copyArray,
  shuffleArray,
  makeJSON,
  isValidJSON,
  isJSON_Object,
  IsJsonString,
  removeItemFromObject,
  emptyVariable,
  arrayIncludesAllValues,
  object_HasAllConditions,
  Object_deepEqual,
  deepCopyObject,
  isArray,
  isObject,
  removeFromObject,
  object_length,
};
