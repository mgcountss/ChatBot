import { Masterchat, stringify } from "masterchat";
import fetch from 'node-fetch';
import axios from "axios";
import https from "https";
import fs from 'fs';
import db from './functions/db.js';
import { fork } from 'child_process';

console.log('Starting chatbot...')
const axiosInstance = axios.create({
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true }),
});

let mc;
let webhook1;
let webhook2;
let webhook3;

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

function action(thing, id) {
    try {
        console.log("Action: " + thing + " on " + id);
        if (thing == "ban") {
            mc.hide(id).catch((error) => {
                console.error(error);
            });
        } else if (thing == "delete") {
            mc.remove(id).catch((error) => {
                console.error(error);
            });
        } else if (thing == 'timeout') {
            mc.timeout(id).catch((error) => {
                console.error(error);
            });
        }
    } catch (err) {
        console.log(err);
    }
};

let preventDouble = [];
let lastCalledMinutes = new Date().getMinutes() - 1;
let futureChats = [];
let goingThroughMessages = false;
let id = "";
let bot = "";

const startBot = async (id1, bot1) => {
    await stopBot();
    id = id1;
    bot = bot1;
    console.log('start bot lol')
    mc = await Masterchat.init(id1, { axiosInstance, credentials: fs.readFileSync('./user/credentials.txt', 'utf8') });
    mc.on("error", async (err) => {
        console.log(err);
        mc.stop();
        startBot(id, bot);
    });
    mc.on("end", async () => {
        console.log("ended");
        mc.stop();
        startBot(id, bot);
    });
    mc.on("actions", async (chats) => {
        if (chats.length > 0) {
            for (const chat of chats) {
                if (chat.type === 'addChatItemAction') {
                    if (chat.timestampUsec > new Date().getTime() * 1000 - 300000000) {
                        futureChats.push(chat);
                    }
                }
            }
        }
    });
    mc.listen();
}

const stopBot = async () => {
    try {
        let stream = await db.getOne('stream');
        stream.live = false;
        stream.viewers = 0;
        stream.title = "";
        stream.thumbnail = "./default.webp";
        await db.overwriteOne('stream', stream);
        mc.stop();
    } catch (err) { }
}

setInterval(async () => {
    if (goingThroughMessages == false) {
        if (new Date().getMinutes() !== lastCalledMinutes) {
            if ((new Date().getMinutes() % 5 == 0) || ((new Date().getMinutes() % 5) == (lastCalledMinutes + 1)) && (lastCalledMinutes !== new Date().getMinutes() - 1) && (lastCalledMinutes !== new Date().getMinutes() + 1)) {
                console.log("Updating everything");
                lastCalledMinutes = new Date().getMinutes();
                await updateEverything();
            } else {
                chatAction(futureChats);
                futureChats = [];
            }
        } else {
            chatAction(futureChats);
            futureChats = [];
        }
    } else {
        if (new Date().getMinutes() !== lastCalledMinutes) {
            if ((new Date().getMinutes() % 5 == 0) || ((new Date().getMinutes() % 5) == (lastCalledMinutes + 1)) && (lastCalledMinutes !== new Date().getMinutes() - 1) && (lastCalledMinutes !== new Date().getMinutes() + 1)) {
                console.log("Updating everything");
                lastCalledMinutes = new Date().getMinutes();
                await updateEverything();
            }
        }
    }
}, 10000);

async function chatAction(chats) {
    let messages = await db.getOne('messages');
    let ids = await db.getOne('ids');
    goingThroughMessages = true;
    console.log("Received " + chats.length + " messages");
    chats = chats.sort((a, b) => a.timestampUsec - b.timestampUsec);
    let index = 0;
    for (const chat of chats) {
        index++;
        //console.log(index + "/" + chats.length + ": " + stringify(chat.message));
        async function part1() {
            if (ids.includes(chat.id) == false) {
                if (!preventDouble.includes(chat.id)) {
                    preventDouble.push(chat.id);
                    if (preventDouble.length > 100) {
                        preventDouble.shift();
                    }
                    if (chat.type === 'addChatItemAction') {
                        return await logMessage(chat);
                    } else if (chat.type === 'moderationMessageAction') {
                        await db.addTo('ids', chat.id);
                        if (chat.message) {
                            const modifiedMessage = stringify(chat.message).replace(/@/g, '?');
                            return await sendMessageToWebhook(webhook2, modifiedMessage);
                        } else {
                            const deletedMessage = 'Deleted message: ' + stringify(messages.find(x => x.targetId === chat.id).rawMessage);
                            return await sendMessageToWebhook(webhook2, deletedMessage);
                        }
                    }
                }
            }
        }
        await part1().then(async () => {
            if (index == chats.length) {
                if (new Date().getMinutes() !== lastCalledMinutes) {
                    if ((new Date().getMinutes() % 5 == 0) || ((new Date().getMinutes() % 5) == (lastCalledMinutes + 1)) && (lastCalledMinutes !== new Date().getMinutes() - 1) && (lastCalledMinutes !== new Date().getMinutes() + 1)) {
                        console.log("Updating everything");
                        lastCalledMinutes = new Date().getMinutes();
                        await updateEverything();
                    }
                }
            }
            return "";
        });
    }
    goingThroughMessages = false;
}

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

async function logMessage(chat) {
    let users = await db.getOne('users');
    let messages = await db.getOne('messages');
    let ids = await db.getOne('ids');
    let stream = await db.getOne('stream');
    let giveaway = await db.getOne('giveaway');
    let settings = await db.getOne('settings');
    let counting = await db.getOne('counting');
    let commands = await db.getOne('commands');
    let found = false;
    let respond = true;
    if (ids.includes(chat.id) == false) {
        const userId = chat.authorChannelId;
        let userFound = users.find(u => u.id === userId);
        part1();
        async function part1() {
            if (userFound) {
                found = true;
                chat.timestampUsec = parseFloat(chat.timestampUsec);
                userFound.messages = parseInt(userFound.messages) + 1;
                if ((!userFound.xp) || (userFound.xp == null) || (userFound.xp == undefined) || (isNaN(userFound.xp))) {
                    userFound.xp = 0;
                }
                userFound.xp = parseInt(userFound.xp) + 3;
                if (userFound.id !== bot) {
                    if (checkmilestone(parseInt(userFound.messages))) {
                        sendMSG(`${userFound.name} has sent ${userFound.messages.toLocaleString()} messages!`);
                    }
                }
                userFound.active = true;
                userFound.isVerified = chat.isVerified;
                userFound.isOwner = chat.isOwner;
                userFound.isModerator = chat.isModerator;
                userFound.name = chat.authorName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                userFound.photo = chat.authorPhoto;
                userFound.lastMSG = parseFloat(chat.timestampUsec);
                await db.overwriteObjectInArray('users', 'id', userFound.id, userFound);
                part2()
            } else {
                part2()
            }
        }
        async function part2() {
            let users = await db.getOne('users');
            let commands = await db.getOne('commands');
            let settings = await db.getOne('settings');
            let stream = await db.getOne('stream');
            let ids = await db.getOne('ids');
            let messages = await db.getOne('messages');
            let giveaway = await db.getOne('giveaway');
            let counting = await db.getOne('counting');
            let found = await db.findOne('users', 'id', chat.authorChannelId);
            let respond = true;
            if (!found) {
                let obj = {
                    id: chat.authorChannelId,
                    messages: 1,
                    lastMSG: parseFloat(chat.timestampUsec),
                    isOwner: chat.isOwner,
                    isModerator: chat.isModerator,
                    isVerified: chat.isVerified,
                    name: chat.authorName.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                    photo: chat.authorPhoto,
                    hours: 0,
                    points: 1,
                    xp: 0,
                    cooldown: [],
                    warnings: [],
                    customRank: "",
                    firstseen: parseFloat(chat.timestampUsec),
                    active: true,
                    blacklist: [],
                    hourlyStats: {
                        "0": {
                            "messages": 0,
                            "xp": 0,
                            "points": 0
                        }
                    },
                    dailyStats: {}
                };
                await db.addTo('users', obj);
                if (chat.authorChannelId !== bot) {
                    sendMSG(`Welcome @${obj.name} to the stream!`);
                }
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
            await db.addTo('ids', chat.id);
            await db.addTo('messages', chat);
            if (ids.length + 1 > 100) {
                await db.removeFirstObject('ids');
            }
            if (messages.length + 1 > 500) {
                await db.removeFirstObject('messages');
            }
            await db.overwriteOne('stream', stream);
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
                if (!(chat.authorChannelId == bot)) {
                    let cmd = false;
                    for (let i = 0; i < commands.length; i++) {
                        let add = 1;
                        if ((chat.message.includes('!vote ')) || (chat.message.includes('!wall'))) {
                            add = 5;
                        }
                        if ((stringify(chat.message).split(' ')[0].length > 1) && (stringify(chat.message).split(' ')[0].toLowerCase()) == ((commands[i].command.toLowerCase()))) {
                            const userIndex = users.findIndex(x => x.id === chat.authorChannelId);
                            if (userIndex !== -1) {
                                if ((!users[userIndex].xp) || (users[userIndex].xp == null) || (users[userIndex].xp == undefined) || (isNaN(users[userIndex].xp))) {
                                    users[userIndex].xp = 0;
                                }
                                add = add * 3;
                                users[userIndex].xp += add;
                                await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
                            } else {
                            }
                            return await handleCommand(chat, commands[i]);
                        } else if (commands[i].command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                            const userIndex = users.findIndex(x => x.id === chat.authorChannelId);
                            if (userIndex !== -1) {
                                if ((!users[userIndex].xp) || (users[userIndex].xp == null) || (users[userIndex].xp == undefined) || (isNaN(users[userIndex].xp))) {
                                    users[userIndex].xp = 0;
                                }
                                add = add * 3;
                                users[userIndex].xp += add
                                await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
                            }
                            return await handleCommand(chat, commands[i]);
                        }
                    }
                    if ((cmd == false) && (chat.message)) {
                        if (stringify(chat.message).toLowerCase().includes(giveaway.command.toLowerCase()) || giveaway.command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                            if (giveaway.enabled) {
                                return await handleGiveaway(chat, commands[i], i);
                            }
                        } else if (settings.counting.enabled) {
                            if ((stringify(chat.message) == (counting.number + 1).toString()) || (stringify(chat.message).startsWith((counting.number + 1).toString()))) {
                                const userIndex = users.findIndex(x => x.id === chat.authorChannelId);
                                if (userIndex !== -1) {
                                    if ((!users[userIndex].xp) || (users[userIndex].xp == null) || (users[userIndex].xp == undefined) || (isNaN(users[userIndex].xp))) {
                                        users[userIndex].xp = 0;
                                    }
                                    users[userIndex].xp += 15
                                    await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
                                }
                                if (checkmilestone(counting.number + 1)) {
                                    sendMSG(`${chat.authorName} has counted to ${counting.number + 1}!`);
                                    if (userIndex !== -1) {
                                        users[userIndex].xp += 45;
                                        await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
                                    }
                                }
                                return await handleCounting(chat);
                            }
                        }
                        if (stringify(chat.message).startsWith('!')) {
                            if (stringify(chat.message).startsWith('!place ')) {
                                return "";
                            }
                            chat.message = stringify(chat.message);
                            chat.message = chat.message.replace('!', '!vote ');
                            const userIndex = users.findIndex(x => x.id === chat.authorChannelId);
                            if (userIndex !== -1) {
                                if ((!users[userIndex].xp) || (users[userIndex].xp == null) || (users[userIndex].xp == undefined) || (isNaN(users[userIndex].xp))) {
                                    users[userIndex].xp = 0;
                                }
                                users[userIndex].xp += 15;
                                await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
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
                        const userIndex = users.findIndex(x => x.id === chat.authorChannelId);
                        if (((stringify(chat.message).includes('aj')) || (stringify(chat.message).includes('mg'))) && ((stringify(chat.message).includes('best')) || (stringify(chat.message).includes('great')) || (stringify(chat.message).includes('good')))) {
                            if (userIndex !== -1) {
                                if ((!users[userIndex].xp) || (users[userIndex].xp == null) || (users[userIndex].xp == undefined) || (isNaN(users[userIndex].xp))) {
                                    users[userIndex].xp = 0;
                                }
                                users[userIndex].xp += 15;
                                await db.overwriteObjectInArray('users', 'id', chat.authorChannelId, users[userIndex]);
                            }
                        }
                    }
                }
            }
        }
    }
    return "";
}

async function handleCommand(chat, command) {
    let users = await db.getOne('users');
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
                    for (let i = 0; i < users.length; i++) {
                        if (users[i].id == users[i].id) {
                            users[i].cooldown = users[i].cooldown;
                            await db.overwriteObjectInArray('users', 'id', users[i].id, users[i]);
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return await part2(cooldown, thing)
    }
    async function part2(cooldown, thing) {
        let commands = await db.getOne('commands');
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
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].id == command.id) {
                        commands[i].used = command.used;
                        await db.overwriteObjectInArray('commands', 'id', command.id, command);
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
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].id == command.id) {
                        commands[i].used = command.used;
                        await db.overwriteObjectInArray('commands', 'id', command.id, command);
                    }
                }
                return await variableCheck(response, chat, command)
            }
        }
    }
}

async function handleCounting(chat) {
    let counting = await db.getOne('counting');
    counting.messages.push(chat);
    if (counting.messages.length + 1 > 50) {
        counting.messages.shift();
    }
    counting.number++;
    counting.lastMSG = chat.timestampUsec;
    if (counting.users) {
        let found = false;
        for (let i = 0; i < counting.users.length; i++) {
            if (counting.users[i].id == chat.authorChannelId) {
                counting.users[i].count++;
                counting.users[i].name = chat.authorName;
                counting.users[i].image = chat.authorPhoto;
                found = true;
                break;
            }
        }
        if (found == false) {
            counting.users.push({
                id: chat.authorChannelId,
                name: chat.authorName,
                image: chat.authorPhoto,
                count: 1
            });
        }
    }
    await db.overwriteOne('counting', counting);
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
        await db.updateOne('giveaway', giveaway);
        sendMSG(author.name + ", you have been entered into the giveaway")
    }
}

async function variableCheck(response, msg, cmd) {
    let commands = await db.getOne('commands');
    let connection = await db.getOne('connection');
    let users = await db.getOne('users');
    let votes = await db.getOne('votes');
    response = response.replace(/{query}/g, stringify(msg.message).split(' ').slice(1).join(' '));
    return checkVariables();
    async function checkVariables() {
        if ((response.includes('{addCommand')) || (response.includes('{deleteCommand')) || (response.includes('{editCommand'))) {
            if (response.includes('{addCommand')) {
                response = await response.replace(/\{addCommand\s*([^{}]+)\}/g, (match, expr) => {
                    try {
                        let command = expr.split(' ')[0];
                        let response2 = expr.split(' ').slice(1).join(' ');
                        let found = false;
                        for (let i = 0; i < commands.length; i++) {
                            if (commands[i].command == command) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            let randomStr8 = Math.random().toString(36).substring(7);
                            redo()
                            async function redo() {
                                for (let i = 0; i < commands.length; i++) {
                                    if (commands[i].id == randomStr8) {
                                        randomStr8 = Math.random().toString(36).substring(7);
                                        redo()
                                        break;
                                    }
                                }
                            }
                            db.addTo('commands', {
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
                        for (let i = 0; i < commands.length; i++) {
                            if (commands[i].command == command) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            commands = commands.filter((cmd) => cmd.id != command.id);
                            db.removeObject('commands', 'id', command.id);
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
                        for (let i = 0; i < commands.length; i++) {
                            if (commands[i].command == command) {
                                u = commands[i];
                                u.response = response2;
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            for (let i = 0; i < commands.length; i++) {
                                if (commands[i].id == u.id) {
                                    commands[i] = u;
                                    db.overwriteObjectInArray('commands', 'id', u.id, u);
                                    break;
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
        } else {
            response = response.replace(/{ownerName}/g, connection.channel.snippet.title);
            response = response.replace(/{ownerId}/g, connection.channel.id);
            response = response.replace(/{ownerUrl}/g, connection.channel.customUrl);
            response = response.replace(/{ownerDescription}/g, connection.channel.snippet.description);
            response = response.replace(/{authorName}/g, msg.authorName);
            response = response.replace(/{messageId}/g, msg.id);
            response = response.replace(/{messageTimestamp}/g, msg.timestampUsec);
            response = response.replace(/{authorChannelId}/g, msg.authorChannelId);
            response = response.replace(/{authorPhoto}/g, msg.authorPhoto);
            response = response.replace(/{cmdUses}/g, cmd.used ? cmd.used : 0);
            response = response.replace(/{cmdName}/g, cmd.command);
            response = response.replace(/{authorRank}/g, msg.isVerified ? 'verified' : msg.isOwner ? 'owner' : msg.isModerator ? 'moderator' : 'everyone');
            response = response.replace(/{rawMessage}/g, stringify(msg.rawMessage));
            let authorPoints = 0
            let authorHours = 0
            let authorMessages = 0
            let authorXP = 0
            let authorCustomRole = ""
            if (users.find((user) => user.id == msg.authorChannelId)) {
                let author = users.find((user) => user.id == msg.authorChannelId);
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
            if (response.includes('{addQuote')) {
                response = await response.replace(/\{addQuote\s*([^{}]+)\}/g, (match, expr) => {
                    try {
                        let quote = expr
                        let id = Math.random().toString(36).substring(7);
                        db.addTo('quotes', {
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
                        for (let i = 0; i < votes.length; i++) {
                            if (votes[i].name == vote.toLowerCase()) {
                                found = true;
                                u = votes[i];
                                break;
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
                        for (let i = 0; i < users.length; i++) {
                            if (users[i].name.toLowerCase() == vote.toLowerCase()) {
                                if ((!users[i].xp) || (users[i].xp == null) || (users[i].xp == undefined) || (isNaN(users[i].xp))) {
                                    users[i].xp = 0;
                                }
                                users[i].xp += 15;
                                break;
                            }
                        }
                        for (let i = 0; i < votes.length; i++) {
                            if (votes[i].name == vote.toLowerCase()) {
                                found = true;
                                votes[i].votes += 1;
                                db.overwriteObjectInArray('votes', 'name', vote.toLowerCase(), votes[i]);
                                break;
                            }
                        }
                        if (found) {
                            return `${vote}`;
                        } else if (vote) {
                            db.addTo('votes', {
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
                let things = JSON.parse(JSON.stringify(users));
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
                let things = JSON.parse(JSON.stringify(users));
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
                let things = JSON.parse(JSON.stringify(users));
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
        }
        //console.log(response)
        return await sendMSG(response);
    }
}

async function updateEverything() {
    let users = await db.getOne('users');
    let settings = await db.getOne('settings');
    let pointGainers = [];
    let milestoneMessages = [];
    if (settings.currency) {
        if (settings.currency.enabled == true) {
            for (let i = 0; i < users.length; i++) {
                if (users[i].active == true) {
                    if ((users[i].id != bot)) {
                        users[i].points = (parseFloat(users[i].points) + 1)
                        if ((!users[i].xp) || (users[i].xp == NaN) || (users[i].xp == undefined) || (users[i].xp == null)) {
                            users[i].xp = 0;
                        }
                        users[i].xp = (parseFloat(users[i].xp) + (Math.floor(Math.random() * 5) + 1) * 3);
                        users[i].active = false;
                        if (checkmilestone(parseInt(users[i].points))) {
                            milestoneMessages.push(`${users[i].name} has reached ${users[i].points.toLocaleString()} points!`);
                        }
                        users[i].hours = users[i].points / 12;
                        pointGainers.push(users[i].name);
                        if (!users[i].dailyStats) {
                            users[i].dailyStats = {};
                        }
                        users[i].dailyStats[`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`] = {
                            messages: users[i].messages,
                            points: users[i].points,
                            xp: users[i].xp
                        }
                    } else {
                        if (users[i].id == bot) {
                            users[i].points = 0;
                            users[i].active = false;
                            users[i].hours = 0;
                            users[i].messages = 0;
                            users[i].xp = 0;
                        }
                    }
                    if ((!users[i].xp) || (users[i].xp == NaN) || (users[i].xp == undefined) || (users[i].xp == null)) {
                        users[i].xp = 0;
                    }
                    if (!users[i].hourlyStats) {
                        users[i].hourlyStats = {};
                    }
                    users[i].hourlyStats[parseInt(new Date().getHours())] = {
                        messages: users[i].messages,
                        points: users[i].points,
                        xp: users[i].xp
                    }
                }
            }
            await db.overwriteOne('users', users);
            if (pointGainers.length > 0) {
                sendMSG(`${new Date().toString().split('GMT')[0]}: ${pointGainers.length} users have gained 1 point (${pointGainers})`);
                for (let i = 0; i < milestoneMessages.length; i++) {
                    sendMSG(milestoneMessages[i]);
                }
                let Child = fork('backup.js', [id]);
                Child.on('exit', (code) => {
                    console.log(`Points child exited with code ${code}`);
                });
            }
            console.log(`${new Date()}: ${pointGainers.length} users have gained 1 point (${pointGainers})`)
        }
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
            await db.editWithinArray('timers', 'name', timers[i].name, 'lastCalled', currentTime)
            sendMSG(timers[i].text);
        }
    }
}, 10000)

async function sendMSG(message) {
    if (message) {
        console.log(message)
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
                for (let i = 0; i < messages.length; i++) {
                    mc.sendMessage(messages[i]).catch((error) => { })
                }
                return;
            } else {
                message = message.toString()
                mc.sendMessage(message).catch((error) => { })
                return;
            }
        } else {
            return "";
        }
    } else {
        return "";
    }
}

async function removeDuplicates() {
    let newArray = {};
    let users = await db.getOne('users');
    for (let i = 0; i < users.length; i++) {
        if (!newArray[users[i].id]) {
            newArray[users[i].id] = users[i];
        } else {
            if (newArray[users[i].id].points < users[i].points) {
                newArray[users[i].id] = users[i];
            }
        }
    }
    let array = [];
    for (let i in newArray) {
        array.push(newArray[i]);
    }
    await db.overwriteOne('users', array);
}
removeDuplicates()

export default {
    action,
    startBot,
    stopBot
}