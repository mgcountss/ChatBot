import fs from 'fs';

const findUserIdFromToken = async (token) => {
  try {
    let key = fs.readFileSync('./users/key.json', 'utf8');
    let json = JSON.parse(key);
    let id = json[token];
    return id;
  } catch (error) {
    console.log(error);
  }
}

const getOne = async (userId, type) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${userId}/db/${type}.json`, "utf8"));
    return json;
  } catch (error) { }
};

const overwriteOne = async (userId, type, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${userId}/db/${type}.json`, "utf8"));
    json = value;
    fs.writeFileSync(`./users/${userId}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) {
    console.log(error);
  }
};

const deleteFromArray = async (userId, type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${userId}/db/${type}.json`, "utf8"));
    json[key] = json[key].filter((item) => item !== value);
    fs.writeFileSync(`./users/${userId}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const addObject = async (id, type, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    json.push(value);
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const removeObject = async (id, type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    json = json.filter((item) => item[key] !== value);
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const removeFirstObject = async (id, type) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    json.shift();
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const pushToArray = async (id, type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    json[key].push(value);
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const pushToArrayBasedOnKey = async (id, key, key2, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${key}.json`, "utf8"));
    for (let i = 0; i < json.length; i++) {
      if (json[i].id === key2) {
        json[i][key].push(value);
      }
    }
    fs.writeFileSync(`./users/${id}/db/${key}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const editWithinArray = async (id, type, key, value, key2, value2) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i][key2] = value2;
      }
    }
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const editWithinArray2 = async (id, type, array, key, value, key2, value2) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    let array = json[array];
    for (let i = 0; i < array.length; i++) {
      if (array[i][key] === value) {
        array[i][key2] = value2;
      }
    }
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};


const overwriteObjectInArray = async (id, type, key, value, value2) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./users/${id}/db/${type}.json`, "utf8"));
    let e = false;
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i] = value2;
        e = true;
      }
    }
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(json), "utf8");
    return "success"
  } catch (error) {}
};

const overWriteAll = async (id, type, value) => {
  try {
    fs.writeFileSync(`./users/${id}/db/${type}.json`, JSON.stringify(value), "utf8");
  } catch (error) { }
};

export default {
  findUserIdFromToken,
  getOne,
  overwriteOne,
  deleteFromArray,
  addObject,
  removeObject,
  removeFirstObject,
  pushToArray,
  pushToArrayBasedOnKey,
  editWithinArray,
  overwriteObjectInArray,
  overWriteAll,
  editWithinArray2
};