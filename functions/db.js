import fs from 'fs';
let db = {}
try {
  db = {
    commands: JSON.parse(fs.readFileSync('./user/db/commands.json', 'utf8')),
    connection: JSON.parse(fs.readFileSync('./user/db/connection.json', 'utf8')),
    counting: JSON.parse(fs.readFileSync('./user/db/counting.json', 'utf8')),
    currency: JSON.parse(fs.readFileSync('./user/db/currency.json', 'utf8')),
    giveaway: JSON.parse(fs.readFileSync('./user/db/giveaway.json', 'utf8')),
    ids: JSON.parse(fs.readFileSync('./user/db/ids.json', 'utf8')),
    messages: JSON.parse(fs.readFileSync('./user/db/messages.json', 'utf8')),
    quotes: JSON.parse(fs.readFileSync('./user/db/quotes.json', 'utf8')),
    settings: JSON.parse(fs.readFileSync('./user/db/settings.json', 'utf8')),
    stream: JSON.parse(fs.readFileSync('./user/db/stream.json', 'utf8')),
    timers: JSON.parse(fs.readFileSync('./user/db/timers.json', 'utf8')),
    users: JSON.parse(fs.readFileSync('./user/db/users.json', 'utf8')),
    votes: JSON.parse(fs.readFileSync('./user/db/votes.json', 'utf8'))
  }
} catch (error) {
  fs.mkdirSync('./user/db', { recursive: true });
  fs.writeFileSync('./user/db/commands.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/connection.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/counting.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/currency.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/giveaway.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/ids.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/messages.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/quotes.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/settings.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/stream.json', '{}', 'utf8');
  fs.writeFileSync('./user/db/timers.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/users.json', '[]', 'utf8');
  fs.writeFileSync('./user/db/votes.json', '[]', 'utf8');
  db = {
    commands: JSON.parse(fs.readFileSync('./user/db/commands.json', 'utf8')),
    connection: JSON.parse(fs.readFileSync('./user/db/connection.json', 'utf8')),
    counting: JSON.parse(fs.readFileSync('./user/db/counting.json', 'utf8')),
    currency: JSON.parse(fs.readFileSync('./user/db/currency.json', 'utf8')),
    giveaway: JSON.parse(fs.readFileSync('./user/db/giveaway.json', 'utf8')),
    ids: JSON.parse(fs.readFileSync('./user/db/ids.json', 'utf8')),
    messages: JSON.parse(fs.readFileSync('./user/db/messages.json', 'utf8')),
    quotes: JSON.parse(fs.readFileSync('./user/db/quotes.json', 'utf8')),
    settings: JSON.parse(fs.readFileSync('./user/db/settings.json', 'utf8')),
    stream: JSON.parse(fs.readFileSync('./user/db/stream.json', 'utf8')),
    timers: JSON.parse(fs.readFileSync('./user/db/timers.json', 'utf8')),
    users: JSON.parse(fs.readFileSync('./user/db/users.json', 'utf8')),
    votes: JSON.parse(fs.readFileSync('./user/db/votes.json', 'utf8'))
  }
}

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
    let json = db[type];
    json = JSON.parse(JSON.stringify(json));
    return json;
  } catch (error) { }
};

const overwriteOne = async (type, value) => {
  try {
    db[type] = value;
  } catch (error) {
    console.log(error);
  }
};

const deleteFromArray = async (type, key, value) => {
  try {
    let json = db[type];
    json = json.filter((item) => item[key] !== value);
    db[type] = json;
  } catch (error) { }
};

const addTo = async (type, value) => {
  try {
    let json = db[type];
    json.push(value);
    db[type] = json;
  } catch (error) { }
};

const removeObject = async (type, key, value) => {
  try {
    let json = db[type];
    json = json.filter((item) => item[key] !== value);
    db[type] = json;
  } catch (error) { }
};

const removeFirstObject = async (type) => {
  try {
    let json = db[type];
    json.shift();
    db[type] = json;
  } catch (error) { }
};

const pushToArray = async (type, key, value) => {
  try {
    let json = db[type];
    json[key].push(value);
    db[type] = json;
  } catch (error) { }
};

const editWithinArray = async (type, key, value, key2, value2) => {
  try {
    let json = db[type];
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i][key2] = value2;
      }
    }
    db[type] = json;
  } catch (error) { }
};

const overwriteObjectInArray = async (type, key, value, value2) => {
  try {
    let json = db[type];
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i] = value2;
        db[type] = json;
        break;
      }
    }
    return "success"
  } catch (error) { }
};

const overWriteAll = async (type, value) => {
  try {
    db[type] = value;
  } catch (error) { }
};

const addToWithinObject = async (type, key, value, key2, value2) => {
  try {
    let json = db[type];
    json[key][value][key2].push(value2);
    db[type] = json;
  } catch (error) {
    console.log(error);
  }
};

const findOne = async (type, key, value) => {
  try {
    let json = db[type];
    let found = json.find((item) => item[key] === value);
    found = JSON.parse(JSON.stringify(found));
    return found;
  } catch (error) { }
}

const updateValue = async (type, key, value, key2, value2) => {
  try {
    let json = db[type];
    for (let i = 0; i < json.length; i++) {
      if (json[i][key] === value) {
        json[i][key2] = value2;
      }
    }
    db[type] = json;
  } catch (error) { }
}

const syncDBToFiles = async () => {
  db = {
    commands: JSON.parse(fs.readFileSync('./user/db/commands.json', 'utf8')),
    connection: JSON.parse(fs.readFileSync('./user/db/connection.json', 'utf8')),
    counting: JSON.parse(fs.readFileSync('./user/db/counting.json', 'utf8')),
    currency: JSON.parse(fs.readFileSync('./user/db/currency.json', 'utf8')),
    giveaway: JSON.parse(fs.readFileSync('./user/db/giveaway.json', 'utf8')),
    ids: JSON.parse(fs.readFileSync('./user/db/ids.json', 'utf8')),
    messages: JSON.parse(fs.readFileSync('./user/db/messages.json', 'utf8')),
    quotes: JSON.parse(fs.readFileSync('./user/db/quotes.json', 'utf8')),
    settings: JSON.parse(fs.readFileSync('./user/db/settings.json', 'utf8')),
    stream: JSON.parse(fs.readFileSync('./user/db/stream.json', 'utf8')),
    timers: JSON.parse(fs.readFileSync('./user/db/timers.json', 'utf8')),
    users: JSON.parse(fs.readFileSync('./user/db/users.json', 'utf8')),
    votes: JSON.parse(fs.readFileSync('./user/db/votes.json', 'utf8'))
  }
};


setInterval(() => {
  fs.writeFileSync('./user/db/commands.json', JSON.stringify(db.commands), 'utf8');
  fs.writeFileSync('./user/db/connection.json', JSON.stringify(db.connection), 'utf8');
  fs.writeFileSync('./user/db/counting.json', JSON.stringify(db.counting), 'utf8');
  fs.writeFileSync('./user/db/currency.json', JSON.stringify(db.currency), 'utf8');
  fs.writeFileSync('./user/db/giveaway.json', JSON.stringify(db.giveaway), 'utf8');
  fs.writeFileSync('./user/db/ids.json', JSON.stringify(db.ids), 'utf8');
  fs.writeFileSync('./user/db/messages.json', JSON.stringify(db.messages), 'utf8');
  fs.writeFileSync('./user/db/quotes.json', JSON.stringify(db.quotes), 'utf8');
  fs.writeFileSync('./user/db/settings.json', JSON.stringify(db.settings), 'utf8');
  fs.writeFileSync('./user/db/stream.json', JSON.stringify(db.stream), 'utf8');
  fs.writeFileSync('./user/db/timers.json', JSON.stringify(db.timers), 'utf8');
  fs.writeFileSync('./user/db/users.json', JSON.stringify(db.users), 'utf8');
  fs.writeFileSync('./user/db/votes.json', JSON.stringify(db.votes), 'utf8');
}, 60000);

export default {
  findUserIdFromToken,
  getOne,
  overwriteOne,
  deleteFromArray,
  addTo,
  removeObject,
  removeFirstObject,
  pushToArray,
  editWithinArray,
  overwriteObjectInArray,
  overWriteAll,
  addToWithinObject,
  findOne,
  updateValue,
  syncDBToFiles
};