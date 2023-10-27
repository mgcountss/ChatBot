import { Masterchat, stringify } from "masterchat";
import fetch from 'node-fetch';
import axios from "axios";
import https from "https";
import fs from 'fs';
import db from './db.js';
import { fork } from 'child_process';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth"
//npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
puppeteer.use(StealthPlugin())

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

console.log('Starting chatbot...')
const axiosInstance = axios.create({
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true }),
});
const mc = await Masterchat.init(process.argv[3], { axiosInstance });

let webhook1;
let webhook2;
let webhook3;

let batch = {
    "ids": [],
    "messages": [],
    "users": [],
    "moderation": {},
    "stream": {},
    "giveaway": {},
    "settings": {},
    "counting": {},
    "commands": [],
    "votes": [],
    "connection": {},
    "commands": [],
    "active": false
}
let end = false;

try {
    webhook1 = fs.readFileSync('./user/webhook1.txt', 'utf8');
} catch (err) { }
try {
    webhook2 = fs.readFileSync('./user/webhook2.txt', 'utf8');
} catch (err) { }
try {
    webhook3 = fs.readFileSync('./user/webhook3.txt', 'utf8');
    webhook3 = webhook3.replace('https://discord.com/api/webhooks/', 'https://discord.com/api/v10/webhooks/');
    webhook3 = webhook3 + "?wait=true"
} catch (err) { }

console.log('Chatbot started')
console.log("Connection Started");

process.on('message', (message) => {
    if (message.startsWith('ban___')) {
        let id = message.split('___')[1];
        mc.hide(id).catch((error) => {
            console.error(error);
        });
    } else if (message.startsWith('delete___')) {
        let id = message.split('___')[1];
        db.removeObject('messages', 'id', id);
        mc.remove(id).catch((error) => {
            console.error(error);
        });
    } else if (message.startsWith('timeout___')) {
        let id = message.split('___')[1]
        mc.timeout(id).catch((error) => {
            console.error(error);
        });
    } else if (message.startsWith('end')) {
        end = true;
    }
});

let preventDouble = [];
let first = true;
let lastCalledMinutes = new Date().getMinutes() - 1;

mc.on("actions", async (chats) => {
    if (first == false) {
        chats = chats.sort((a, b) => a.timestampUsec - b.timestampUsec);
        batch.ids = await db.getOne('ids');
        batch.messages = await db.getOne('messages');
        batch.users = await db.getOne('users');
        batch.moderation = await db.getOne('moderation');
        batch.stream = await db.getOne('stream');
        batch.giveaway = await db.getOne('giveaway');
        batch.settings = await db.getOne('settings');
        batch.counting = await db.getOne('counting');
        batch.commands = await db.getOne('commands');
        batch.votes = await db.getOne('votes');
        batch.connection = await db.getOne('connection');
        batch.commands = await db.getOne('commands');
        batch.active = true;
        let index = 0;
        if (chats.length > 0) {
            console.log("Received " + chats.length + " messages");
        }
        for (const chat of chats) {
            index++;
            async function part1() {
                if (!batch.ids.includes(chat.id)) {
                    if (!preventDouble.includes(chat.id)) {
                        preventDouble.push(chat.id);
                        if (preventDouble.length > 100) {
                            preventDouble.shift();
                        }
                        if (chat.type === 'addChatItemAction') {
                            let a = new Date();
                            return await logMessage(chat, a);
                        } else if (chat.type === 'moderationMessageAction') {
                            batch.ids.push(chat.id);
                            if (chat.message) {
                                const modifiedMessage = stringify(chat.message).replace(/@/g, '?');
                                return await sendMessageToWebhook(webhook2, modifiedMessage);
                            } else {
                                const deletedMessage = 'Deleted message: ' + stringify(batch.messages.find(x => x.targetId === chat.id).rawMessage);
                                return await sendMessageToWebhook(webhook2, deletedMessage);
                            }
                        }
                    }
                }
            }
            await part1().then(async () => {
                if (index == chats.length) {
                    console.log("overwriting");
                    await db.overwriteOne('ids', batch.ids);
                    await db.overwriteOne('messages', batch.messages);
                    await db.overwriteOne('users', batch.users);
                    await db.overwriteOne('moderation', batch.moderation);
                    await db.overwriteOne('stream', batch.stream);
                    await db.overwriteOne('giveaway', batch.giveaway);
                    await db.overwriteOne('settings', batch.settings);
                    await db.overwriteOne('counting', batch.counting);
                    await db.overwriteOne('commands', batch.commands);
                    await db.overwriteOne('votes', batch.votes);
                    await db.overwriteOne('connection', batch.connection);
                    await db.overwriteOne('commands', batch.commands);
                    batch = {
                        "ids": [],
                        "messages": [],
                        "users": [],
                        "moderation": {},
                        "stream": {},
                        "giveaway": {},
                        "settings": {},
                        "counting": {},
                        "commands": [],
                        "votes": [],
                        "connection": {},
                        "commands": [],
                        "active": false
                    }
                    if (new Date().getMinutes() !== lastCalledMinutes) {
                        if ((new Date().getMinutes() % 5 == 0) || ((new Date().getMinutes() % 5) == (lastCalledMinutes + 1)) && (lastCalledMinutes !== new Date().getMinutes() - 1) && (lastCalledMinutes !== new Date().getMinutes() + 1)) {
                            console.log("Updating everything");
                            lastCalledMinutes = new Date().getMinutes();
                            await updateEverything();
                        }
                    }
                    if (end == true) {
                        process.exit();
                    }
                }
            });
        }
    }
    first = false;
});

mc.on("error", (err) => {
    end = true;
    setTimeout(() => {
        process.exit();
    }, 15000);
});

mc.on("end", () => {
    end = true;
    setTimeout(() => {
        process.exit();
    }, 15000);
})

setInterval(async () => {
    if (new Date().getMinutes() !== lastCalledMinutes) {
        if ((new Date().getMinutes() % 5 == 0) || ((new Date().getMinutes() % 5) == (lastCalledMinutes + 1)) && (lastCalledMinutes !== new Date().getMinutes() - 1) && (lastCalledMinutes !== new Date().getMinutes() + 1)) {
            console.log("Updating everything");
            lastCalledMinutes = new Date().getMinutes();
            await updateEverything();
        }
    }
}, 60000);

async function sendMessageToWebhook(url, content) {
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "content": content,
            })
        });
    } catch (err) { }
    return "";
}

function checkmilestone(num) {
    num = parseInt(num);
    if (num % 100 == 0) {
        return true;
    } else {
        return false;
    }
}

async function logMessage(chat, start) {
    let { users, moderation, messages, ids, stream, giveaway, settings, counting, commands } = JSON.parse(JSON.stringify(batch));
    let found = false;
    let respond = true;
    if (users && moderation && messages && ids && stream && giveaway && settings) {
        if (!ids.includes(chat.id)) {
            const userId = chat.authorChannelId;
            let userFound = users.find(u => u.id === userId);
            let a = new Date();
            let b = new Date();
            part1();
            function part1() {
                if (userFound) {
                    found = true;
                    if (!userFound.warns) {
                        userFound.warns = [];
                    }
                    if (!userFound.allWarns) {
                        userFound.allWarns = [];
                    }
                    if (userId !== process.argv[4] && moderation.enabled) {
                        if (moderation.messagesPer10SecondsEnabled) {
                            let totalMessages = 1;
                            let msgs = [];
                            for (let i = 0; i < users.length; i++) {
                                if (users[i].id === userId) {
                                    const filtered = messages.filter(x => x.timestampUsec > chat.timestampUsec - 10000000);
                                    for (let j = 0; j < filtered.length; j++) {
                                        if (filtered[j].authorChannelId === userId) {
                                            if (!moderation.checked10.includes(filtered[j].id)) {
                                                totalMessages++;
                                                msgs.push(filtered[j].id);
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                            if (totalMessages > parseFloat(moderation.messagesPer10Seconds)) {
                                respond = false;
                                userFound.warns.push({
                                    type: 'messagesPer10Seconds',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec,
                                });
                                userFound.allWarns.push({
                                    type: 'messagesPer10Seconds',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec,
                                });
                                batch.moderation.actions.push({
                                    type: 'messagesPer10Seconds',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec
                                });
                                msgs.push(chat.id);
                                for (let i = 0; i < msgs.length; i++) {
                                    batch.moderation.checked10.push(msgs[i]);
                                }
                                if (userFound.warns.length < moderation.warnsBeforeTimeout) {
                                    sendMSG(`@${userFound.name} was warned for spamming (${userFound.warns.length}/${moderation.warnsBeforeTimeout})`);
                                }
                            }
                        }
                        if (moderation.messagesPerMinuteEnabled) {
                            let totalMessages = 1;
                            let msgs = [];
                            for (let i = 0; i < users.length; i++) {
                                if (users[i].id === userId) {
                                    const filtered = messages.filter(x => x.timestampUsec > chat.timestampUsec - 60000000);
                                    for (let j = 0; j < filtered.length; j++) {
                                        if (filtered[j].authorChannelId === userId) {
                                            if (!moderation.checked60.includes(filtered[j].id)) {
                                                totalMessages++;
                                                msgs.push(filtered[j].id);
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                            if (totalMessages > parseFloat(moderation.messagesPerMinute)) {
                                respond = false;
                                userFound.warns.push({
                                    type: 'messagesPerMinute',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec,
                                });
                                userFound.allWarns.push({
                                    type: 'messagesPerMinute',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec,
                                });
                                batch.moderation.actions.push({
                                    type: 'messagesPerMinute',
                                    message: chat.message,
                                    timestamp: chat.timestampUsec
                                });
                                msgs.push(chat.id);
                                for (let i = 0; i < msgs.length; i++) {
                                    batch.moderation.checked60.push(msgs[i]);
                                }
                                if (userFound.warns.length < moderation.warnsBeforeTimeout) {
                                    sendMSG(`@${userFound.name} was warned for spamming (${userFound.warns.length}/${moderation.warnsBeforeTimeout})`);
                                }
                            }
                        }
                        if (userFound.warns.length >= moderation.warnsBeforeTimeout) {
                            sendMSG(`@${userFound.name} was put in timeout`);
                            batch.moderation.actions.push({
                                type: 'timeout',
                                message: `@${userFound.name} was put in timeout`,
                                timestamp: chat.timestampUsec,
                            });
                            userFound.warns = [];
                            mc.timeout(userFound.id).catch((error) => {
                                console.error(error);
                            });
                        }
                    }
                    b = new Date();
                    chat.timestampUsec = parseFloat(chat.timestampUsec);
                    userFound.messages = parseInt(userFound.messages) + 1;
                    if ((!userFound.xp) || (userFound.xp == null) || (userFound.xp == undefined) || (isNaN(userFound.xp))) {
                        userFound.xp = 0;
                    }
                    userFound.xp = parseInt(userFound.xp) + 1;
                    if (userFound.id !== process.argv[4]) {
                        if (checkmilestone(parseInt(userFound.messages))) {
                            sendMSG(`${userFound.name} has sent ${userFound.messages.toLocaleString()} messages!`);
                        }
                    }
                    userFound.active = true;
                    userFound.membership = chat.membership;
                    userFound.isVerified = chat.isVerified;
                    userFound.isOwner = chat.isOwner;
                    userFound.isModerator = chat.isModerator;
                    userFound.name = chat.authorName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    userFound.photo = chat.authorPhoto;
                    userFound.lastMSG = parseFloat(chat.timestampUsec);
                    for (let i = 0; i < batch.users.length; i++) {
                        if (batch.users[i].id == userFound.id) {
                            batch.users[i] = userFound;
                        }
                    }
                    b = new Date();
                    part2()
                } else {
                    part2()
                }
            }
            async function part2() {
                a = new Date();
                if (!found) {
                    let obj = {
                        id: chat.authorChannelId,
                        messages: 1,
                        lastMSG: parseFloat(chat.timestampUsec),
                        membership: chat.membership,
                        isOwner: chat.isOwner,
                        isModerator: chat.isModerator,
                        isVerified: chat.isVerified,
                        name: chat.authorName.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                        photo: chat.authorPhoto,
                        hours: 0,
                        points: 1,
                        xp: 0,
                        cooldown: [],
                        warns: [],
                        allWarns: [],
                        customRank: "",
                        firstseen: parseFloat(chat.timestampUsec),
                        active: true,
                        blacklist: [],
                        hourlyStats: {},
                        dailyStats: {},
                        warnings: []
                    };
                    batch.users.push(obj);
                    sendMSG(`Welcome @${obj.name} to the stream!`);
                }
                if (chat.membership) {
                    chat.member = chat.membership.status;
                }
                chat.message = (stringify(chat.message)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                chat.authorName = (stringify(chat.authorName)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (!stream.messages || stream.messages == null || stream.messages == undefined || isNaN(stream.messages)) {
                    stream.messages = 1;
                } else {
                    stream.messages++;
                }
                if (!fs.existsSync('./user')) {
                    fs.mkdirSync('./user');
                }
                if (!fs.existsSync('./user/streams')) {
                    fs.mkdirSync('./user/streams');
                }
                if (fs.existsSync('./user/streams/' + stream.id + '.csv')) {
                    fs.appendFileSync('./user/streams/' + stream.id + '.csv', '\n' + chat.id + ',' + chat.timestampUsec + ',' + chat.authorName + ',' + chat.message);
                } else {
                    fs.writeFileSync('./user/streams/' + stream.id + '.csv', "id,time,name,message\n" + chat.id + ',' + chat.timestampUsec + ',' + chat.authorName + ',' + chat.message);
                }
                batch.messages.push(chat);
                batch.ids.push(chat.id);
                if (ids.length + 1 > 100) {
                    batch.ids.shift();
                }
                if (messages.length + 1 > 500) {
                    batch.messages.shift();
                }
                batch.stream = stream;
                if (webhook1) {
                    let msg = chat.message.replace(/@/g, '?');
                    //msg = msg + "[channel](https://www.youtube.com/channel/" + chat.authorChannelId + ")";
                    fetch(webhook1, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            "content": msg,
                            "username": chat.authorName,
                            "avatar_url": chat.authorPhoto
                        })
                    }).catch(err => console.log(err))
                }
                if (respond == true) {
                    if (!(chat.authorChannelId == process.argv[4])) {
                        let cmd = false;
                        for (let i = 0; i < commands.length; i++) {
                            let add = 1;
                            if ((chat.message.includes('!vote ')) || (chat.message.includes('!wall'))) {
                                add = 5;
                            }
                            if ((stringify(chat.message).split(' ')[0].toLowerCase()) == ((commands[i].command.toLowerCase()))) {
                                const userIndex = batch.users.findIndex(x => x.id === chat.authorChannelId);
                                if (userIndex !== -1) {
                                    if ((!batch.users[userIndex].xp) || (batch.users[userIndex].xp == null) || (batch.users[userIndex].xp == undefined) || (isNaN(batch.users[userIndex].xp))) {
                                        batch.users[userIndex].xp = 0;
                                    }
                                    batch.users[userIndex].xp += add;
                                } else {
                                    console.log("User not found");
                                }
                                return await handleCommand(chat, commands[i]);
                            } else if (commands[i].command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                                const userIndex = batch.users.findIndex(x => x.id === chat.authorChannelId);
                                if (userIndex !== -1) {
                                    if ((!batch.users[userIndex].xp) || (batch.users[userIndex].xp == null) || (batch.users[userIndex].xp == undefined) || (isNaN(batch.users[userIndex].xp))) {
                                        batch.users[userIndex].xp = 0;
                                    }
                                    batch.users[userIndex].xp += add
                                } else {
                                    console.log("User not found");
                                }
                                return await handleCommand(chat, commands[i]);
                            }
                        }
                        if (cmd == false) {
                            if (stringify(chat.message).toLowerCase().includes(giveaway.command.toLowerCase()) || giveaway.command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                                if (giveaway.enabled) {
                                    return await handleGiveaway(chat, commands[i], i);
                                }
                            } else if (settings.counting.enabled) {
                                if ((stringify(chat.message) == (counting.number + 1).toString()) || (stringify(chat.message).startsWith((counting.number + 1).toString()))) {
                                    const userIndex = batch.users.findIndex(x => x.id === chat.authorChannelId);
                                    if (userIndex !== -1) {
                                        if ((!batch.users[userIndex].xp) || (batch.users[userIndex].xp == null) || (batch.users[userIndex].xp == undefined) || (isNaN(batch.users[userIndex].xp))) {
                                            batch.users[userIndex].xp = 0;
                                        }
                                        batch.users[userIndex].xp += 5;
                                    } else {
                                        console.log("User not found");
                                    }
                                    if (checkmilestone(counting.number + 1)) {
                                        sendMSG(`${chat.authorName} has counted to ${counting.number + 1}!`);
                                        if (userIndex !== -1) {
                                            batch.users[userIndex].xp += 15;
                                        }
                                    }
                                    return await handleCounting(chat);
                                }
                            }
                            if (stringify(chat.message).startsWith('!')) {
                                chat.message = stringify(chat.message);
                                chat.message = chat.message.replace('!', '!vote ');
                                const userIndex = batch.users.findIndex(x => x.id === chat.authorChannelId);
                                if (userIndex !== -1) {
                                    if ((!batch.users[userIndex].xp) || (batch.users[userIndex].xp == null) || (batch.users[userIndex].xp == undefined) || (isNaN(batch.users[userIndex].xp))) {
                                        batch.users[userIndex].xp = 0;
                                    }
                                    batch.users[userIndex].xp += 5;
                                } else {
                                    console.log("User not found");
                                }
                                return await handleCommand(chat, {
                                    "command": "!vote",
                                    "response": "{authorName} {ifBlock {authorCustomRole}} voted for {vote {query}} ({math {voteCount {query}} + 1})",
                                    "permission": "everyone",
                                    "cooldown": 30,
                                    "default": true,
                                    "id": "8tuf4g"
                                });
                            }
                            const userIndex = batch.users.findIndex(x => x.id === chat.authorChannelId);
                            if (((stringify(chat.message).includes('aj')) || (stringify(chat.message).includes('mg'))) && ((stringify(chat.message).includes('best')) || (stringify(chat.message).includes('great')) || (stringify(chat.message).includes('good')))) {
                                if (userIndex !== -1) {
                                    if ((!batch.users[userIndex].xp) || (batch.users[userIndex].xp == null) || (batch.users[userIndex].xp == undefined) || (isNaN(batch.users[userIndex].xp))) {
                                        batch.users[userIndex].xp = 0;
                                    }
                                    batch.users[userIndex].xp += 10;
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        console.log('something is undefined');
    }
    return "";
}

async function handleCommand(chat, command) {
    let a = new Date();
    let { users } = JSON.parse(JSON.stringify(batch));
    return await part1();
    async function part1() {
        let cooldown = false;
        let thing = false;
        if (chat.authorChannelId) {
            for (let i = 0; i < users.length; i++) {
                if (users[i].id == chat.authorChannelId) {
                    if (command.permission == 'everyone') {
                        thing = true;
                    } else {
                        if (command.permission == 'owner' && users[i].isOwner == true) {
                            thing = true;
                        }
                        if (command.permission == 'moderator' && users[i].isModerator == true) {
                            thing = true;
                        } else if (command.permission == 'moderator' && users[i].isOwner == true) {
                            thing = true;
                        }
                        if (command.permission == 'verified' && users[i].isVerified == true) {
                            thing = true;
                        }
                        if (command.permission == 'member' && users[i].membership.status == 'Member') {
                            thing = true;
                        }
                    }
                    if (users[i].cooldown) {
                        let found = false;
                        for (let q = 0; q < users[i].cooldown.length; q++) {
                            if (users[i].cooldown[q].command == command.command) {
                                found = true;
                                let cmdCooldown = command.cooldown;
                                let currentTime = new Date().getTime();
                                let cooldownTime = users[i].cooldown[q].time;
                                if (currentTime - cooldownTime < cmdCooldown * 1000) {
                                    cooldown = true;
                                    sendMSG(users[i].name + ' is on cooldown for ' + (-Math.floor((cmdCooldown - (currentTime - cooldownTime)) / 1000)) + ' seconds');
                                } else {
                                    users[i].cooldown[q].time = currentTime;
                                    cooldown = false;
                                }
                                break;
                            }
                        }
                        if (!found) {
                            users[i].cooldown.push({
                                command: command.command,
                                time: new Date().getTime()
                            });
                        }
                    } else {
                        users[i].cooldown = [];
                    }
                    for (let i = 0; i < batch.users.length; i++) {
                        if (batch.users[i].id == users[i].id) {
                            batch.users[i].cooldown = users[i].cooldown;
                        }
                    }
                    return await part2(cooldown, thing)
                }
            }
        }
    }
    async function part2(cooldown, thing) {
        if ((cooldown == false) && (thing == true)) {
            chat.message = stringify(chat.message);
            if (chat.message.includes(' ')) {
                let message = chat.message.split(' ');
                let response = command.response;
                if (command.used) {
                    command.used++;
                } else {
                    command.used = 1;
                }
                for (let i = 1; i < message.length; i++) {
                    response = response.replace(`{${i}}`, message[i]);
                }
                for (let i = 0; i < batch.commands.length; i++) {
                    if (batch.commands[i].id == command.id) {
                        batch.commands[i].used = command.used;
                    }
                }
                return await variableCheck(response, chat, command)
            } else {
                let response = command.response;
                if (command.used) {
                    command.used++;
                } else {
                    command.used = 1;
                }
                for (let i = 0; i < batch.commands.length; i++) {
                    if (batch.commands[i].id == command.id) {
                        batch.commands[i].used = command.used;
                    }
                }
                return await variableCheck(response, chat, command)
            }
        }
    }
}

async function handleCounting(chat) {
    batch.counting.messages.push(chat);
    if (batch.counting.messages.length + 1 > 50) {
        batch.counting.messages.shift();
    }
    batch.counting.number++;
    batch.counting.lastMSG = chat.timestampUsec;
    if (batch.counting.users) {
        let found = false;
        for (let i = 0; i < batch.counting.users.length; i++) {
            if (batch.counting.users[i].id == chat.authorChannelId) {
                batch.counting.users[i].count++;
                batch.counting.users[i].name = chat.authorName;
                batch.counting.users[i].image = chat.authorPhoto;
                found = true;
                break;
            }
        }
        if (found == false) {
            batch.counting.users.push({
                id: chat.authorChannelId,
                name: chat.authorName,
                image: chat.authorPhoto,
                count: 1
            });
        }
    }
    return "";
}

async function handleGiveaway(chat) {
    let giveaway = await db.getOne('giveaway');
    let users = await db.getOne('users');
    let author = users.find(x => x.id == chat.authorChannelId);
    if (giveaway.entryRank == 'everyone') {
        if (giveaway.entries.includes(chat.authorChannelId)) {
            sendMSG(author.name + ", you have already entered")
        } else {
            if (giveaway.requirementType == 'none') {
                enter();
            } else if (parseFloat(author[giveaway.requirementType]) >= parseFloat(giveaway.requirementAmount)) {
                enter();
            } else {
                sendMSG(author.name + ", you do not meet the requirements")
                return;
            }
        }
    } else {
        if (giveaway.entryRank == "moderator" && author.isModerator) {
            checkNext();
        } else if (giveaway.entryRank == "verified" && author.isVerified) {
            checkNext();
        } else if (giveaway.entryRank == "member" && author.membership.status == "Member") {
            checkNext();
        } else if (giveaway.entryRank == "owner" && author.isOwner) {
            checkNext();
        } else {
            sendMSG(author.name + ", you do not meet the requirements")
            return;
        }
    }
    async function checkNext() {
        if (giveaway.entries.includes(chat.authorChannelId)) {
            sendMSG(author.name + ", you have already entered")
        } else {
            if (giveaway.requirementType == 'none') {
                enter();
            } else if (parseFloat(author[giveaway.requirementType]) >= parseFloat(giveaway.requirementAmount)) {
                enter();
            } else {
                sendMSG(author.name + ", you do not meet the requirements")
                return;
            }
        }
    }
    async function enter() {
        giveaway.entries.push(chat.authorChannelId);
        db.updateOne('giveaway', giveaway);
        sendMSG(author.name + ", you have been entered into the giveaway")
    }
}

async function variableCheck(response, msg, cmd) {
    return checkVariables();
    async function checkVariables() {
        response = response.replace(/{query}/g, stringify(msg.message).split(' ').slice(1).join(' '));
        response = response.replace(/{ownerName}/g, batch.connection.channel.snippet.title);
        response = response.replace(/{ownerId}/g, batch.connection.channel.id);
        response = response.replace(/{ownerUrl}/g, batch.connection.channel.customUrl);
        response = response.replace(/{ownerDescription}/g, batch.connection.channel.snippet.description);
        response = response.replace(/{authorName}/g, msg.authorName);
        response = response.replace(/{messageId}/g, msg.id);
        response = response.replace(/{messageTimestamp}/g, msg.timestampUsec);
        response = response.replace(/{authorChannelId}/g, msg.authorChannelId);
        response = response.replace(/{authorPhoto}/g, msg.authorPhoto);
        response = response.replace(/{cmdUses}/g, cmd.used ? cmd.used : 0);
        response = response.replace(/{cmdName}/g, cmd.command);
        if (msg.membership) {
            if (msg.membership.since) {
                response = response.replace(/{membership}/g, msg.membership.since);
            } else {
                response = response.replace(/{membership}/g, 'undefined');
            }
        } else {
            response = response.replace(/{membership}/g, 'undefined');
        }
        response = response.replace(/{authorRank}/g, msg.isVerified ? 'verified' : msg.isOwner ? 'owner' : msg.isModerator ? 'moderator' : 'everyone');
        response = response.replace(/{rawMessage}/g, stringify(msg.rawMessage));
        let authorPoints = 0
        let authorHours = 0
        let authorMessages = 0
        let authorXP = 0
        let authorCustomRole = ""
        if (batch.users.find((user) => user.id == msg.authorChannelId)) {
            let author = batch.users.find((user) => user.id == msg.authorChannelId);
            if (author) {
                authorXP = author.xp ? author.xp : 0;
                authorPoints = author.points;
                authorHours = parseFloat(author.hours).toFixed(2);
                authorMessages = author.messages;
                authorCustomRole = author.customRank;
            }
        }
        response = response.replace(/{authorPoints}/g, (authorPoints).toLocaleString());
        response = response.replace(/{authorXP}/g, (authorXP).toLocaleString());
        response = response.replace(/{authorHours}/g, authorHours);
        response = response.replace(/{authorMessages}/g, (authorMessages).toLocaleString());
        response = response.replace(/{authorCustomRole}/g, authorCustomRole);
        if (response.includes('{addCommand')) {
            response = await response.replace(/\{addCommand\s*([^{}]+)\}/g, (match, expr) => {
                try {
                    let command = expr.split(' ')[0];
                    let response2 = expr.split(' ').slice(1).join(' ');
                    let found = false;
                    for (let i = 0; i < batch.commands.length; i++) {
                        if (batch.commands[i].command == command) {
                            found = true;
                        }
                    }
                    if (!found) {
                        let randomStr8 = Math.random().toString(36).substring(7);
                        redo()
                        async function redo() {
                            for (let i = 0; i < batch.commands.length; i++) {
                                if (batch.commands[i].id == randomStr8) {
                                    randomStr8 = Math.random().toString(36).substring(7);
                                    redo()
                                }
                            }
                        }
                        batch.commands.push({
                            id: randomStr8,
                            command: command,
                            response: response2,
                            default: false,
                            used: 0,
                            cooldown: 0,
                            permission: 'everyone'
                        });
                        return `added ${command}`;
                    } else {
                        return `${command} already exists`;
                    }
                } catch (e) {
                    console.log(e)
                    return "";
                }
            });
        }
        if (response.includes('{deleteCommand')) {
            response = await response.replace(/\{deleteCommand\s*([^{}]+)\}/g, (match, expr) => {
                try {
                    let command = expr.split(' ')[0];
                    let found = false;
                    for (let i = 0; i < batch.commands.length; i++) {
                        if (batch.commands[i].command == command) {
                            found = true;
                        }
                    }
                    if (found) {
                        batch.commands = batch.commands.filter((cmd) => cmd.id != command.id);
                        return `removed ${command}`;
                    } else {
                        return `${command} does not exist`;
                    }
                } catch (e) {
                    console.log(e)
                    return "";
                }
            });
        }
        if (response.includes('{editCommand')) {
            response = await response.replace(/\{editCommand\s*([^{}]+)\}/g, (match, expr) => {
                try {
                    let command = expr.split(' ')[0];
                    let response2 = expr.split(' ').slice(1).join(' ');
                    let found = false;
                    let u;
                    for (let i = 0; i < batch.commands.length; i++) {
                        if (batch.commands[i].command == command) {
                            u = batch.commands[i];
                            u.response = response2;
                            found = true;
                        }
                    }
                    if (found) {
                        for (let i = 0; i < batch.commands.length; i++) {
                            if (batch.commands[i].id == u.id) {
                                batch.commands[i] = u;
                            }
                        }
                        return `edited ${command}`;
                    } else {
                        return `${command} does not exist`;
                    }
                } catch (e) {
                    console.log(e)
                    return "";
                }
            });
        }
        if (response.includes('{addQuote')) {
            response = await response.replace(/\{addQuote\s*([^{}]+)\}/g, (match, expr) => {
                try {
                    let quote = expr
                    let id = Math.random().toString(36).substring(7);
                    batch.quotes.push({
                        quote: quote,
                        id: id,
                        time: Date.now(),
                        quotedBy: msg.authorChannelId
                    });
                    return `quoted ${quote}`;
                } catch (e) {
                    console.log(e)
                    return "";
                }
            });
        }
        try {
            if (response.includes('{voteCount')) {
                response = await response.replace(/\{voteCount\s*([^{}]+)\}/g, (match, expr) => {
                    let vote = expr
                    let found = false;
                    let u;
                    for (let i = 0; i < batch.votes.length; i++) {
                        if (batch.votes[i].name == vote.toLowerCase()) {
                            found = true;
                            u = batch.votes[i];
                        }
                    }
                    if (found) {
                        return `${u.votes}`;
                    } else {
                        return `0`;
                    }
                })
            }
            if (response.includes('{vote ')) {
                response = await response.replace(/\{vote\s*([^{}]+)\}/g, (match, expr) => {
                    let vote = expr
                    let found = false;
                    for (let i = 0; i < batch.users.length; i++) {
                        if (batch.users[i].name.toLowerCase() == vote.toLowerCase()) {
                            if ((!batch.users[i].xp) || (batch.users[i].xp == null) || (batch.users[i].xp == undefined) || (isNaN(batch.users[i].xp))) {
                                batch.users[i].xp = 0;
                            }
                            batch.users[i].xp += 10;
                        }
                    }
                    for (let i = 0; i < batch.votes.length; i++) {
                        if (batch.votes[i].name == vote.toLowerCase()) {
                            found = true;
                            batch.votes[i].votes += 1;
                        }
                    }
                    if (found) {
                        return `${vote}`;
                    } else if (vote) {
                        batch.votes.push({
                            name: vote.toLowerCase(),
                            votes: 1
                        });
                        return `${vote}`;
                    } else {
                        return `0`;
                    }
                });
            }
        } catch (e) { }
        if (response.includes('{ifBlock ')) {
            let inside = response.split('{ifBlock ')[1].split('}')[0];
            if (inside.length > 0) {
                response = response.replace(/\{ifBlock\s*([^{}]+)\}/g, "[" + inside + "]");
            } else {
                response = response.replace(/\{ifBlock\s*([^{}]+)\}/g, "");
            }
        }
        if (response.includes('{authorDaily}')) {
            let things = [...batch.users];
            let author = things.find((user) => user.id == msg.authorChannelId);
            let gain = {
                points: author.points,
                messages: author.messages,
                hours: author.points / 12
            }
            if (Object.keys(author.dailyStats).length > 2) {
                let keys = Object.keys(author.dailyStats);
                let pointsGain = (parseFloat(author.points) - parseFloat(author.dailyStats[keys[keys.length - 2]].points));
                let msgGain = (parseFloat(author.messages) - parseFloat(author.dailyStats[keys[keys.length - 2]].messages));
                let hoursGain = pointsGain / 12;
                gain = {
                    points: pointsGain.toLocaleString(),
                    messages: msgGain.toLocaleString(),
                    hours: hoursGain.toFixed(2).toLocaleString()
                }
            }
            response = response.replace(/{authorDaily}/g, "Points: " + gain.points + ", Messages: " + gain.messages + ", Hours: " + gain.hours);
        }
        if (response.includes('{authorWeekly}')) {
            let things = [...batch.users];
            let author = things.find((user) => user.id == msg.authorChannelId);
            let gain = {
                points: author.points,
                messages: author.messages,
                hours: author.points / 12
            }
            if (Object.keys(author.dailyStats).length > 8) {
                let keys = Object.keys(author.dailyStats);
                let pointsGain = (parseFloat(author.points) - parseFloat(author.dailyStats[keys[keys.length - 8]].points));
                let msgGain = (parseFloat(author.messages) - parseFloat(author.dailyStats[keys[keys.length - 8]].messages));
                let hoursGain = pointsGain / 12;
                gain = {
                    points: pointsGain.toLocaleString(),
                    messages: msgGain.toLocaleString(),
                    hours: hoursGain.toFixed(2).toLocaleString()
                }
            }
            response = response.replace(/{authorWeekly}/g, "Points: " + gain.points + ", Messages: " + gain.messages + ", Hours: " + gain.hours);
        }
        if (response.includes('{authorMonthly}')) {
            let things = [...batch.users];
            let author = things.find((user) => user.id == msg.authorChannelId);
            let gain = {
                points: author.points,
                messages: author.messages,
                hours: author.points / 12
            }
            if (Object.keys(author.dailyStats).length > 30) {
                let keys = Object.keys(author.dailyStats);
                let pointsGain = (parseFloat(author.points) - parseFloat(author.dailyStats[keys[keys.length - 30]].points));
                let msgGain = (parseFloat(author.messages) - parseFloat(author.dailyStats[keys[keys.length - 30]].messages));
                let hoursGain = pointsGain / 12;
                gain = {
                    points: pointsGain.toLocaleString(),
                    messages: msgGain.toLocaleString(),
                    hours: hoursGain.toFixed(2).toLocaleString()
                }
            }
            response = response.replace(/{authorMonthly}/g, "Points: " + gain.points + ", Messages: " + gain.messages + ", Hours: " + gain.hours);
        }
        if (response.includes('{math')) {
            response = response.replace(/\{math\s*([^{}]+)\}/g, (match, expr) => {
                try {
                    expr = expr.replace(/x/g, '*');
                    expr = expr.replace(/÷/g, '/');
                    expr = expr.replace(/[^-()\d/*+.]/g, '');
                    const result = eval(expr);
                    return result.toString();
                } catch (e) {
                    return "";
                }
            });
        }
        if (response.includes('{writeFile ')) {
            response = await nextThing()
            async function nextThing() {
                let fileName = response.split('{writeFile ')[1].split('}')[0];
                if (fileName == 'wall.txt') {
                    let fileContent = response.split('}')[1];
                    if (fileName.includes('/')) {
                        fileName = fileName.split('/');
                        fileName = fileName[fileName.length - 1];
                    }
                    if (fileName.includes('\\')) {
                        fileName = fileName.split('\\');
                        fileName = fileName[fileName.length - 1];
                    }
                    async function stuff() {
                        if (fs.existsSync(`./user`)) {
                            fs.writeFile(`./user/files/` + fileName, fileContent, (error) => {
                                if (error) {
                                    console.error(error);
                                }
                            });
                        } else {
                            fs.mkdirSync(`./user`);
                            fs.writeFile(fileName, fileContent, (error) => {
                                if (error) {
                                    console.error(error);
                                }
                            });
                        }
                        response = `added ${msg.authorName}`;
                        return response
                    }
                    return stuff()
                } else {
                    return "You can only write to wall.txt"
                }
            }
        }
        if (response.includes('{warn ')) {
            response = await nextThing()
            async function nextThing() {
                let message = response.split('{warn ')[1].split('}')[0];
                if (message.includes(' | ')) {
                    let user = message.split(' | ')[1];
                    let username = "";
                    let userID = "";
                    let reason = message.split(' | ')[0];
                    let total = 0;
                    for (let i = 0; i < batch.users.length; i++) {
                        if ((batch.users[i].name.toLowerCase() == user.toLowerCase()) || (batch.users[i].id == user)) {
                            return await nextThing2(i)
                            async function nextThing2(i) {
                                username = batch.users[i].name;
                                userID = batch.users[i].id;
                                if (batch.users[i].warnings) {
                                    batch.users[i].warnings.push({
                                        reason: reason,
                                        time: Date.now(),
                                        mod: msg.authorName
                                    });
                                    total = batch.users[i].warnings.length;
                                    found = true;
                                } else {
                                    batch.users[i].warnings = [{
                                        reason: reason,
                                        time: Date.now(),
                                        mod: msg.authorName
                                    }];
                                    total = 1;
                                    found = true;
                                }
                                if (!batch.users[i].channelID) {
                                    await fetch(webhook3, {
                                        "headers": {
                                            "Accept": "application/json",
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            "content": "",
                                            "embeds": [{
                                                "description": `**${username}** has been warned!\n\n**Reason:** ${reason}\n\nTotal Warnings: **${total}**\n[Channel](https://www.youtube.com/channel/${userID})`,
                                                "color": 16711680,
                                                "timestamp": new Date().toISOString(),
                                                "footer": {
                                                    "text": "Warned by: " + msg.authorName
                                                }
                                            }],
                                            "thread_name": username
                                        }),
                                        "method": "POST",
                                        "mode": "cors"
                                    }).then(res => res.json()).then(data => {
                                        batch.users[i]['channelID'] = data.channel_id;
                                        return `warned ${username}, ${total}`
                                    }).catch(err => {
                                        console.log(err)
                                    })
                                } else {
                                    await fetch(webhook3 + "?thread_id=" + batch.users[i].channelID, {
                                        "headers": {
                                            "Accept": "application/json",
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            "content": "",
                                            "embeds": [{
                                                "description": `**${username}** has been warned!\n\n**Reason:** ${reason}\n\nTotal Warnings: **${total}**\n[Channel](https://www.youtube.com/channel/${userID})`,
                                                "color": 16711680,
                                                "timestamp": new Date().toISOString(),
                                                "footer": {
                                                    "text": "Warned by: " + msg.authorName
                                                }
                                            }],
                                            "thread_name": username
                                        }),
                                        "method": "POST",
                                        "mode": "cors"
                                    }).catch(err => {
                                        console.log(err)
                                    });
                                    return `warned ${username}, ${total}`;
                                }
                            }
                        }
                    }
                } else {
                    return "@" + msg.authorName + ", Please provide the name/id and a reason."
                }
            }
        }
        console.log(response)
        return await sendMSG(response);
    }
}

async function sendMSG(message) {
    if (message) {
        if (message.length > 0) {
            if (message == "") {
                return;
            }
            if (message.length > 200) {
                let messages = [];
                while (message.length > 200) {
                    messages.push(message.substring(0, 200));
                    message = message.substring(200);
                }
                messages.push(message);
                messages = messages.reverse();
                for (let i = 0; i < messages.length; i++) {
                    return realSendMSG(messages[i])
                }
            } else {
                message = message.toString()
                return realSendMSG(message)
            }
        } else {
            return ""
        }
    } else {
        return ""
    }
}

mc.on("error", (error) => {
    console.error(error);
});

mc.on("end", () => {
    console.log("Connection closed");
    process.exit();
});

async function updateEverything() {
    let pointGainers = [];
    let milestoneMessages = [];
    let users = await db.getOne('users');
    let settings = await db.getOne('settings');
    if (settings.currency.enabled == true) {
        for (let i = 0; i < users.length; i++) {
            if (users[i].active == true) {
                if ((users[i].id != process.argv[4])) {
                    users[i].points = (parseFloat(users[i].points) + 1)
                    if ((!users[i].xp) || (users[i].xp == NaN) || (users[i].xp == undefined) || (users[i].xp == null)) {
                        users[i].xp = 0;
                    }
                    users[i].xp = (parseFloat(users[i].xp) + Math.floor(Math.random() * 5) + 1)
                    users[i].active = false;
                    if (checkmilestone(parseInt(users[i].points))) {
                        milestoneMessages.push(`${users[i].name} has reached ${users[i].points.toLocaleString()} points!`);
                    }
                    users[i].hours = users[i].points / 12;
                    pointGainers.push(users[i].name);
                    users[i].dailyStats[`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`] = {
                        messages: users[i].messages,
                        points: users[i].points,
                        xp: users[i].xp
                    }
                } else {
                    if (users[i].id == process.argv[4]) {
                        users[i].points = 0;
                        users[i].active = false;
                        users[i].hours = 0;
                        users[i].messages = 0;
                        users[i].xp = 0;
                    }
                }
            }
            if ((!users[i].xp) || (users[i].xp == NaN) || (users[i].xp == undefined) || (users[i].xp == null)) {
                users[i].xp = 0;
            }
            users[i].hourlyStats[parseInt(new Date().getHours())] = {
                messages: users[i].messages,
                points: users[i].points,
                xp: users[i].xp
            }
        }
        db.overwriteOne('users', users);
        if (pointGainers.length > 0) {
            sendMSG(`${new Date().toString().split('GMT')[0]}: ${pointGainers.length} users have gained 1 point (${pointGainers})`);
            for (let i = 0; i < milestoneMessages.length; i++) {
                sendMSG(milestoneMessages[i]);
            }
            let Child = fork('backup.js', [process.argv[2]]);
            Child.on('exit', (code) => {
                console.log(`Child exited with code ${code}`);
            });
        }
        console.log(`${new Date()}: ${pointGainers.length} users have gained 1 point (${pointGainers})`)
    }
}

setInterval(async () => {
    let timers = await db.getOne('timers');
    for (let i = 0; i < timers.length; i++) {
        let interval = timers[i].interval * 1000;
        let currentTime = new Date().getTime();
        let lastCalled = timers[i].lastCalled;
        let difference = currentTime - lastCalled;
        if (difference >= interval) {
            timers[i].lastCalled = currentTime;
            db.editWithinArray('timers', 'name', timers[i].name, 'lastCalled', currentTime)
            sendMSG(timers[i].text);
        }
    }
}, 1000)
let page;

async function realSendMSG(msg) {
    await page.click('yt-live-chat-text-input-field-renderer')
    await page.keyboard.type(msg)
    await delay(500);
    await page.keyboard.press('Enter')
    return msg;
}

puppeteer.launch({ headless: true }).then(async browser => {
    page = await browser.newPage()
    await page.setExtraHTTPHeaders(JSON.parse(fs.readFileSync('./user/headers.json', 'utf8')));
    let cookies = fs.readFileSync('./user/cookies.txt', 'utf8');
    cookies = cookies.split('; ');
    for (let i = 0; i < cookies.length; i++) {
        if (!cookies[i].includes('Secure')) {
            const cookie = cookies[i];
            const name = cookie.split('=')[0];
            const value = cookie.split('=')[1];
            await page.setCookie({ name: name, value: value, domain: '.youtube.com' });
        }
    }
    await page.setViewport({ width: 1000, height: 600 })
    await page.setJavaScriptEnabled(true)
    await page.goto('https://www.youtube.com/live_chat?is_popout=1&v=' + process.argv[3])
    setInterval(async () => {
        await page.close()
        page = await browser.newPage()
        await page.setExtraHTTPHeaders(JSON.parse(fs.readFileSync('./user/headers.json', 'utf8')));
        let cookies = fs.readFileSync('./user/cookies.txt', 'utf8');
        cookies = cookies.split('; ');
        for (let i = 0; i < cookies.length; i++) {
            if (!cookies[i].includes('Secure')) {
                const cookie = cookies[i];
                const name = cookie.split('=')[0];
                const value = cookie.split('=')[1];
                await page.setCookie({ name: name, value: value, domain: '.youtube.com' });
            }
        }
        await page.setViewport({ width: 1000, height: 600 })
        await page.setJavaScriptEnabled(true)
        await page.goto('https://www.youtube.com/live_chat?is_popout=1&v=' + process.argv[3])
    }, 3600000);
})

mc.listen();