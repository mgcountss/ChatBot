import fs from "fs";
import db from "./db.js";
const backup = async (id) => {
    if (!fs.existsSync('./user')) {
        fs.mkdirSync('./user');
    }
    let user = {
        commands: await db.getOne('commands'),
        connection: await db.getOne('connection'),
        counting: await db.getOne('counting'),
        giveaway: await db.getOne('giveaway'),
        ids: await db.getOne('ids'),
        messages: await db.getOne('messages'),
        moderation: await db.getOne('moderation'),
        settings: await db.getOne('settings'),
        stream: await db.getOne('stream'),
        timers: await db.getOne('timers'),
        users: await db.getOne('users'),
        votes: await db.getOne('votes'),
        quotes: await db.getOne('quotes')
    }
    if (fs.existsSync(`./user/archives`)) {
        fs.writeFileSync(`./user/archives/${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}.json`, JSON.stringify(user));
    } else {
        fs.mkdirSync(`./user/archives`);
        fs.writeFileSync(`./user/archives/${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}.json`, JSON.stringify(user));
    }
    process.exit();
}
backup(process.argv[2]);