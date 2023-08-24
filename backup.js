import fs from "fs";
import db from "./db.js";
const backup = async (id) => {
    if (!fs.existsSync('./users/' + process.argv[2])) {
        fs.mkdirSync('./users/' + process.argv[2]);
    }
    let user = {
        commands: await db.getOne(process.argv[2], 'commands'),
        connection: await db.getOne(process.argv[2], 'connection'),
        counting: await db.getOne(process.argv[2], 'counting'),
        giveaway: await db.getOne(process.argv[2], 'giveaway'),
        ids: await db.getOne(process.argv[2], 'ids'),
        messages: await db.getOne(process.argv[2], 'messages'),
        moderation: await db.getOne(process.argv[2], 'moderation'),
        settings: await db.getOne(process.argv[2], 'settings'),
        stream: await db.getOne(process.argv[2], 'stream'),
        timers: await db.getOne(process.argv[2], 'timers'),
        users: await db.getOne(process.argv[2], 'users'),
        votes: await db.getOne(process.argv[2], 'votes')
    }
    if (fs.existsSync(`./users/${process.argv[2]}/archives`)) {
        fs.writeFileSync(`./users/${process.argv[2]}/archives/${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}.json`, JSON.stringify(user));
    } else {
        fs.mkdirSync(`./users/${process.argv[2]}/archives`);
        fs.writeFileSync(`./users/${process.argv[2]}/archives/${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}.json`, JSON.stringify(user));
    }
    process.exit();
}
backup(process.argv[2]);