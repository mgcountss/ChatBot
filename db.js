import fs from 'fs';

const findUserIdFromToken = async (token) => {
  try {
    if (!fs.existsSync('./user/key.json')) {
      fs.writeFileSync('./user/key.json', '{}', 'utf8');
    }
    let key = fs.readFileSync('./user/key.json', 'utf8');
    let json = JSON.parse(key);
    let id = json[token];
    return id;
  } catch (error) {
    console.log(error);
  }
}

const getOne = async (type) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    return json;
  } catch (error) { }
};

const overwriteOne = async (type, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json = value;
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) {
    console.log(error);
  }
};

const deleteFromArray = async (type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json = json.filter((item) => item[key] !== value);
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const addObject = async (type, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json.push(value);
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const removeObject = async (type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json = json.filter((item) => item[key] !== value);
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const removeFirstObject = async (type) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json.shift();
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const pushToArray = async (type, key, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    json[key].push(value);
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const pushToArrayBasedOnKey = async (key, key2, value) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${key}.json`, "utf8"));
    for (let i = 0; i < json.length; i++) {
      if (json[i].id === key2) {
        json[i][key].push(value);
      }
    }
    fs.writeFileSync(`./user/db/${key}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const editWithinArray = async (type, key, value, key2, value2) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i][key2] = value2;
      }
    }
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
  } catch (error) { }
};

const overwriteObjectInArray = async (type, key, value, value2) => {
  try {
    let json = JSON.parse(fs.readFileSync(`./user/db/${type}.json`, "utf8"));
    let e = false;
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i] = value2;
        e = true;
      }
    }
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(json), "utf8");
    return "success"
  } catch (error) {}
};

const overWriteAll = async (type, value) => {
  try {
    fs.writeFileSync(`./user/db/${type}.json`, JSON.stringify(value), "utf8");
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
  overWriteAll
};