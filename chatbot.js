import { Masterchat, stringify } from "masterchat";
import fetch from 'node-fetch';
import fs from 'fs';
import db from './db.js';
import { fork } from 'child_process';

console.log('Starting chatbot...')

let credentials = JSON.parse(fs.readFileSync('./users/' + process.argv[2] + '/credentials.json'));
const mc = await Masterchat.init(process.argv[3], { credentials });
mc.sendMessage("alive").catch((error) => {
    console.error(error);
});

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
        db.removeObject(process.argv[2], 'messages', 'id', id);
        mc.remove(id).catch((error) => {
            console.error(error);
        });
    } else if (message.startsWith('timeout___')) {
        let id = message.split('___')[1]
        mc.timeout(id).catch((error) => {
            console.error(error);
        });
    } else if (message.startsWith('stop')) {
        process.exit();
    }
});

const webhookURL = 'https://discord.com/api/webhooks/1121515631955689602/djrgaGHrq3WfRGAnihmBaKVqwPb_5OUAXGbSXcEjzds5snu0PbPD09M8-yW-N4tOGD6g';
mc.on("actions", async (chats) => {
    chats = chats.sort((a, b) => a.timestampUsec - b.timestampUsec);
    let ids = await db.getOne(process.argv[2], 'ids');
    let messages = await db.getOne(process.argv[2], 'messages');
    let users = await db.getOne(process.argv[2], 'users');
    let moderation = await db.getOne(process.argv[2], 'moderation');
    let stream = await db.getOne(process.argv[2], 'stream');
    let giveaway = await db.getOne(process.argv[2], 'giveaway');
    let settings = await db.getOne(process.argv[2], 'settings');
    let counting = await db.getOne(process.argv[2], 'counting');
    for (const chat of chats) {
        if (!ids.includes(chat.id)) {
            if (chat.type === 'addChatItemAction') {
                let a = new Date();
                await logMessage(chat, users, moderation, messages, ids, stream, giveaway, settings, counting);
                let b = new Date();
                console.log("logMessage took", (b - a)/1000, "seconds", chat.rawMessage);
            } else if (chat.type === 'moderationMessageAction' && process.argv[2] === "UCSgk1g0AZi9_759yfz-iIHg") {
                if (chat.message) {
                    const modifiedMessage = stringify(chat.message).replace(/@/g, 'ï¼ ');
                    await sendMessageToWebhook(webhookURL, modifiedMessage);
                } else {
                    const deletedMessage = 'Deleted message: ' + stringify(messages.find(x => x.targetId === chat.id).rawMessage);
                    await sendMessageToWebhook(webhookURL, deletedMessage);
                }
                db.addObject(process.argv[2], 'ids', chat.id);
            }
        }
    }
});

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
}

async function handleCounting(chat) {
    console.log("handleCounting", chat.rawMessage);
    let counting = await db.getOne(process.argv[2], 'counting');
    counting.messages.push(chat);
    if (counting.messages.length + 1 > 50) {
        counting.messages.shift();
    }
    counting.number++;
    counting.lastMSG = chat.timestampUsec;
    db.overwriteOne(process.argv[2], 'counting', counting);
    if (counting.users) {
        let found = false;
        for (let i = 0; i < counting.users.length; i++) {
            if (counting.users[i].id == chat.authorChannelId) {
                counting.users[i].count++;
                counting.users[i].name = chat.authorName;
                counting.users[i].image = chat.authorPhoto;
                found = true;
                db.editWithinArray(process.argv[2], 'counting', 'id', chat.authorChannelId, 'count', counting.users[i].count);
                db.editWithinArray(process.argv[2], 'counting', 'id', chat.authorChannelId, 'name', chat.authorName);
                db.editWithinArray(process.argv[2], 'counting', 'id', chat.authorChannelId, 'image', chat.authorPhoto);
                break;
            }
        }
        if (found == false) {
            db.pushToArray(process.argv[2], 'counting', 'users', {
                id: chat.authorChannelId,
                name: chat.authorName,
                image: chat.authorPhoto,
                count: 1
            });
        }
    }
}

async function logMessage(chat, users, moderation, messages, ids, stream, giveaway, settings, counting) {
    let found = false;
    let respond = true;
    if (users && moderation && messages && ids && stream && giveaway && settings) {
        if (!ids.includes(chat.id)) {
            const userId = chat.authorChannelId;
            let userFound = users.find(u => u.id === userId);
            if (userFound) {
                found = true;
                if (!userFound.warns) {
                    userFound.warns = [];
                }
                if (!userFound.allWarns) {
                    userFound.allWarns = [];
                }
                if (userId !== "UCL6_4AyDYTpn_lfF227ur9w" && moderation.enabled) {
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
                            db.pushToArray(process.argv[2], 'moderation', 'actions', {
                                type: 'messagesPer10Seconds',
                                message: chat.message,
                                timestamp: chat.timestampUsec
                            });
                            msgs.push(chat.id);
                            for (let i = 0; i < msgs.length; i++) {
                                db.pushToArray(process.argv[2], 'moderation', 'checked10', msgs[i]);
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
                            db.pushToArray(process.argv[2], 'moderation', 'actions', {
                                type: 'messagesPerMinute',
                                message: chat.message,
                                timestamp: chat.timestampUsec
                            });
                            msgs.push(chat.id);
                            for (let i = 0; i < msgs.length; i++) {
                                db.pushToArray(process.argv[2], 'moderation', 'checked60', msgs[i]);
                            }
                            if (userFound.warns.length < moderation.warnsBeforeTimeout) {
                                sendMSG(`@${userFound.name} was warned for spamming (${userFound.warns.length}/${moderation.warnsBeforeTimeout})`);
                            }
                        }
                    }
                    if (userFound.warns.length >= moderation.warnsBeforeTimeout) {
                        sendMSG(`@${userFound.name} was put in timeout`);
                        db.pushToArray(process.argv[2], 'moderation', 'actions', {
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
                chat.timestampUsec = parseFloat(chat.timestampUsec);
                userFound.messages = parseInt(userFound.messages) + 1;
                if (checkmilestone(parseInt(userFound.messages))) {
                    sendMSG(`${userFound.name} has sent ${userFound.messages.toLocaleString()} messages!`);
                }
                userFound.active = true;
                userFound.membership = chat.membership;
                userFound.isVerified = chat.isVerified;
                userFound.isOwner = chat.isOwner;
                userFound.isModerator = chat.isModerator;
                userFound.name = chat.authorName.replace(/</g, 'â®').replace(/>/g, 'â¯');
                userFound.photo = chat.authorPhoto;
                userFound.lastMSG = parseFloat(chat.timestampUsec);
                db.overwriteObjectInArray(process.argv[2], 'users', 'id', userId, userFound);
            }
            if (!found) {
                db.addObject(process.argv[2], 'users', {
                    id: chat.authorChannelId,
                    messages: 1,
                    lastMSG: parseFloat(chat.timestampUsec),
                    membership: chat.membership,
                    isOwner: chat.isOwner,
                    isModerator: chat.isModerator,
                    isVerified: chat.isVerified,
                    name: chat.authorName.replace(/</g, "â®").replace(/>/g, "â¯"),
                    photo: chat.authorPhoto,
                    hours: 0,
                    points: 1,
                    cooldown: [],
                    warns: [],
                    allWarns: [],
                    customRank: "",
                    firstseen: parseFloat(chat.timestampUsec),
                    active: true,
                    blacklist: [],
                    hourlyStats: {},
                    dailyStats: {}
                });
            }
            chat.message = (stringify(chat.message)).replace(/</g, "â®").replace(/>/g, "â¯")
            chat.authorName = (stringify(chat.authorName)).replace(/</g, "â®").replace(/>/g, "â¯")
            if (!stream.messages || stream.messages == null || stream.messages == undefined || isNaN(stream.messages)) {
                stream.messages = 1;
            } else {
                stream.messages++;
            }
            if (!fs.existsSync('./users/' + process.argv[2])) {
                fs.mkdirSync('./users/' + process.argv[2]);
            }
            if (!fs.existsSync('./users/' + process.argv[2] + '/streams')) {
                fs.mkdirSync('./users/' + process.argv[2] + '/streams');
            }
            if (fs.existsSync('./users/' + process.argv[2] + '/streams/' + stream.id + '.csv')) {
                fs.appendFileSync('./users/' + process.argv[2] + '/streams/' + stream.id + '.csv', '\n' + chat.id + ',' + chat.timestampUsec + ',' + chat.authorName + ',' + chat.message);
            } else {
                fs.writeFileSync('./users/' + process.argv[2] + '/streams/' + stream.id + '.csv', "id,time,name,message\n" + chat.id + ',' + chat.timestampUsec + ',' + chat.authorName + ',' + chat.message);
            }
            db.addObject(process.argv[2], 'messages', chat);
            db.addObject(process.argv[2], 'ids', chat.id);
            if (ids.length + 1 > 100) {
                db.removeFirstObject(process.argv[2], 'ids');
            }
            if (messages.length + 1 > 500) {
                db.removeFirstObject(process.argv[2], 'messages');
            }
            db.overwriteOne(process.argv[2], 'stream', stream);
            if (process.argv[2] == "UCSgk1g0AZi9_759yfz-iIHg") {
                let msg = chat.message.replace(/@/g, 'ï¼ ')
                fetch('https://discord.com/api/webhooks/1100829744452341891/bK1ADRZY4yLClXdgZnSQ8NHY_1lS3DdySeLkRPg7A18FR3MFrqa14Q-0RCEJ5RrYVuKn', {
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
                if (!(chat.authorChannelId == 'UCtYQgljfrPwXajkrgV5JeuQ') && !(chat.authorChannelId == 'UCL6_4AyDYTpn_lfF227ur9w')) {
                    let commands = await db.getOne(process.argv[2], 'commands');
                    let cmd = false;
                    for (let i = 0; i < commands.length; i++) {
                        if ((stringify(chat.message).split(' ')[0].toLowerCase()) == ((commands[i].command.toLowerCase()))) {
                            return await handleCommand(chat, commands[i], i);
                        } else if (commands[i].command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                            return await handleCommand(chat, commands[i], i);
                        }
                    }
                    if (cmd == false) {
                        if (stringify(chat.message).toLowerCase().includes(giveaway.command.toLowerCase()) || giveaway.command.toLowerCase() == stringify(chat.message).toLowerCase()) {
                            if (giveaway.enabled) {
                                await handleGiveaway(chat, commands[i], i);
                            }
                        } else if (settings.counting.enabled) {
                            if ((stringify(chat.message) == (counting.number + 1).toString()) || (stringify(chat.message).startsWith((counting.number + 1).toString()))) {
                                await handleCounting(chat);
                            }
                        }
                        if (stringify(chat.message).startsWith('!')) {
                            chat.message = stringify(chat.message);
                            chat.message = chat.message.replace('!', '!vote ');
                            return await handleCommand(chat, {
                                "command": "!vote",
                                "response": "{authorName} {ifBlock {authorCustomRole}} voted for {vote {query}} ({math {voteCount {query}} + 1})",
                                "permission": "everyone",
                                "cooldown": 30,
                                "default": true,
                                "id": "8tuf4g"
                            }, 10);
                        }
                    }
                }
            }
        }
    }
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

let lastMinute = new Date().getMinutes();
setInterval(async () => {
    let minutes = new Date().getMinutes();
    if (minutes % 5 == 0 && lastMinute != minutes) {
        lastMinute = minutes;
        let pointGainers = [];
        let milestoneMessages = [];
        let users = await db.getOne(process.argv[2], 'users');
        let settings = await db.getOne(process.argv[2], 'settings');
        if (settings.currency.enabled == true) {
            for (let i = 0; i < users.length; i++) {
                if (users[i].active == true) {
                    if ((users[i].id != "UCL6_4AyDYTpn_lfF227ur9w")) {
                        users[i].points = (parseFloat(users[i].points) + 1)
                        users[i].active = false;
                        if (checkmilestone(parseInt(users[i].points))) {
                            milestoneMessages.push(`${users[i].name} has reached ${users[i].points.toLocaleString()} points!`);
                        }
                        users[i].hours = users[i].points / 12;
                        pointGainers.push(users[i].name);
                    }
                }
                users[i].hourlyStats[parseInt(new Date().getHours())] = {
                    messages: users[i].messages,
                    points: users[i].points
                }
                users[i].dailyStats[`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`] = {
                    messages: users[i].messages,
                    points: users[i].points
                }
            }
            db.overwriteOne(process.argv[2], 'users', users);
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
    if ('i' == 'i') {
        let timers = await db.getOne(process.argv[2], 'timers');
        for (let i = 0; i < timers.length; i++) {
            let interval = timers[i].interval * 1000;
            let currentTime = new Date().getTime();
            let lastCalled = timers[i].lastCalled;
            let difference = currentTime - lastCalled;
            if (difference >= interval) {
                timers[i].lastCalled = currentTime;
                db.editWithinArray(process.argv[2], 'timers', 'name', timers[i].name, 'lastCalled', currentTime)
                sendMSG(timers[i].text);
            }
        }
    }
}, 1000)

setInterval(async () => {
    if (queue.length > 0) {
        if (queue[0].length > 200) {
            let messages = [];
            let message = queue[0];
            while (message.length > 200) {
                messages.push(message.substring(0, 200));
                message = message.substring(200);
            }
            messages.push(message);
            messages = messages.reverse();
            for (let i = 0; i < messages.length; i++) {
                console.log("SENDING MESSAGE: " + messages[i]);
                mc.sendMessage(messages[i]).catch((error) => {
                    console.error(error);
                })
            }
            queue.shift();
        } else {
            queue[0] = queue[0].toString()
            console.log("SENDING MESSAGE: " + queue[0]);
            mc.sendMessage(queue[0]).catch((error) => {
                console.error(error);
            });
            queue.shift();
        }
    }
}, 100)

async function handleCommand(chat, command) {
    //console.log("handleCommand", chat.rawMessage);
    let cooldown = false;
    let thing = false;
    let users = await db.getOne(process.argv[2], 'users');
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
                db.editWithinArray(process.argv[2], 'users', 'id', users[i].id, 'cooldown', users[i].cooldown);
                break;
            }
        }
    }
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
            await db.overwriteObjectInArray(process.argv[2], 'commands', 'id', command.id, command);
            let msg = await variableCheck(response, chat, command);
            //console.log("Sending:", msg)
            sendMSG(msg);
            return "";
        } else {
            let response = command.response;
            if (command.used) {
                command.used++;
            } else {
                command.used = 1;
            }
            await db.overwriteObjectInArray(process.argv[2], 'commands', 'id', command.id, command);
            let msg = await variableCheck(response, chat, command);
            //console.log("Sending:", msg)
            sendMSG(msg);
            return "";
        }
    }
    return ""
}

async function handleGiveaway(chat, command, cmdIndex) {
    let giveaway = await db.getOne(process.argv[2], 'giveaway');
    let users = await db.getOne(process.argv[2], 'users');
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
        db.updateOne(process.argv[2], 'giveaway', giveaway);
        sendMSG(author.name + ", you have been entered into the giveaway")
    }
}

let lastused = 0;
async function variableCheck(response, msg, cmd) {
    let connection = await db.getOne(process.argv[2], 'connection');
    let users = await db.getOne(process.argv[2], 'users');
    let commands = await db.getOne(process.argv[2], 'commands');
    let votes = await db.getOne(process.argv[2], 'votes');
    response = response.replace(/{query}/g, stringify(msg.message).split(' ').slice(1).join(' '));
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
    let authorCustomRole = ""
    if (users.find((user) => user.id == msg.authorChannelId)) {
        let author = users.find((user) => user.id == msg.authorChannelId);
        if (author) {
            authorPoints = author.points;
            authorHours = parseFloat(author.hours).toFixed(2);
            authorMessages = author.messages;
            authorCustomRole = author.customRank;
        }
    }
    response = response.replace(/{authorPoints}/g, (authorPoints).toLocaleString());
    response = response.replace(/{authorHours}/g, authorHours);
    response = response.replace(/{authorMessages}/g, (authorMessages).toLocaleString());
    response = response.replace(/{authorCustomRole}/g, authorCustomRole);
    response = await response.replace(/\{addCommand\s*([^{}]+)\}/g, (match, expr) => {
        try {
            let command = expr.split(' ')[0];
            let response2 = expr.split(' ').slice(1).join(' ');
            let found = false;
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].command == command) {
                    found = true;
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
                        }
                    }
                }
                db.addObject(process.argv[2], 'commands', {
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
            //console.log(e)
            return "";
        }
    });
    response = await response.replace(/\{deleteCommand\s*([^{}]+)\}/g, (match, expr) => {
        try {
            let command = expr.split(' ')[0];
            let found = false;
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].command == command) {
                    found = true;
                }
            }
            if (found) {
                db.removeObject(process.argv[2], 'commands', 'id', command.id);
                return `removed ${command}`;
            } else {
                return `${command} does not exist`;
            }
        } catch (e) {
            //console.log(e)
            return "";
        }
    });
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
                }
            }
            if (found) {
                db.overwriteObjectInArray(process.argv[2], 'commands', 'id', u.id, u);
                return `edited ${command}`;
            } else {
                return `${command} does not exist`;
            }
        } catch (e) {
            //console.log(e)
            return "";
        }
    });
    response = await response.replace(/\{addQuote\s*([^{}]+)\}/g, (match, expr) => {
        try {
            let quote = expr
            db.addObject(process.argv[2], 'quotes', {
                quote: quote,
                id: Math.random().toString(36).substring(7),
                time: Date.now(),
                quotedBy: msg.authorChannelId
            });
            return `quoted ${quote}`;
        } catch (e) {
            //console.log(e)
            return "";
        }
    });
    try {
        if (response.includes('{voteCount')) {
            response = await response.replace(/\{voteCount\s*([^{}]+)\}/g, (match, expr) => {
                let vote = expr
                let found = false;
                let u;
                for (let i = 0; i < votes.length; i++) {
                    if (votes[i].name == vote.toLowerCase()) {
                        found = true;
                        u = i;
                    }
                }
                if (found) {
                    return `${votes[u].votes.toLocaleString()}`;
                } else {
                    return `0`;
                }
            })
        }
        if (response.includes('{vote ')) {
            response = await response.replace(/\{vote\s*([^{}]+)\}/g, (match, expr) => {
                let vote = expr
                let found = false;
                let u;
                for (let i = 0; i < votes.length; i++) {
                    if (votes[i].name == vote.toLowerCase()) {
                        found = true;
                        votes[i].votes += 1;
                        u = votes[i];
                    }
                }
                if (found) {
                    db.overwriteObjectInArray(process.argv[2], 'votes', 'name', vote.toLowerCase(), u);
                    return `${vote}`;
                } else if (vote) {
                    db.addObject(process.argv[2], 'votes', {
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
    response = await response.replace(/\{ifBlock\s*([^{}]+)\}/g, (match, expr) => {
        if (expr.length > 1) {
            return "[" + expr + "]";
        } else {
            return "";
        }
    });
    response = await response.replace(/{ifBlock}/g, "");
    if (response.includes('{authorDaily}')) {
        let things = [...users];
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
        let things = [...users];
        let author = things.find((user) => user.id == msg.authorChannelId);
        let gain = {
            points: author.points,
            messages: author.messages,
            hours: author.points / 12
        }
        if (Object.keys(author.dailyStats).length > 7) {
            let keys = Object.keys(author.dailyStats);
            let pointsGain = (parseFloat(author.points) - parseFloat(author.weeklyStats[keys[keys.length - 8]].points));
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
        let things = [...users];
        let author = things.find((user) => user.id == msg.authorChannelId);
        let gain = {
            points: author.points,
            messages: author.messages,
            hours: author.points / 12
        }
        if (Object.keys(author.dailyStats).length > 30) {
            let keys = Object.keys(author.dailyStats);
            let pointsGain = (parseFloat(author.points) - parseFloat(author.dailyStats[keys[keys.length - 31]].points));
            let msgGain = (parseFloat(author.messages) - parseFloat(author.dailyStats[keys[keys.length - 31]].messages));
            let hoursGain = pointsGain / 12;
            gain = {
                points: pointsGain.toLocaleString(),
                messages: msgGain.toLocaleString(),
                hours: hoursGain.toFixed(2).toLocaleString()
            }
        }
        response = response.replace(/{authorMonthly}/g, "Points: " + gain.points + ", Messages: " + gain.messages + ", Hours: " + gain.hours);
    }
    response = response.replace(/\{math\s*([^{}]+)\}/g, (match, expr) => {
        try {
            expr = expr.replace(/x/g, '*');
            expr = expr.replace(/Ã·/g, '/');
            expr = expr.replace(/[^-()\d/*+.]/g, '');
            const result = eval(expr);
            return result.toString();
        } catch (e) {
            return "";
        }
    });
    if (response.includes('{writeFile ')) {
        if (response.includes('battle.txt')) {
            if (lastused + 30000 < Date.now()) {
                lastused = Date.now();
                nextThing()
            } else {
                return msg.authorName + ", please wait " + Math.round((lastused + 30000 - Date.now()) / 1000) + " seconds"
            }
        } else {
            response = nextThing()
        }
        async function nextThing() {
            let fileName = response.split('{writeFile ')[1].split('}')[0];
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
                if (fs.existsSync(`./users/${process.argv[2]}`)) {
                    fs.writeFile(`./users/${process.argv[2]}/files/` + fileName, fileContent, (error) => {
                        if (error) {
                            console.error(error);
                        }
                    });
                } else {
                    fs.mkdirSync(`./users/${process.argv[2]}`);
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
        }
    }
    return response;
}

let queue = [];

async function sendMSG(message) {
    if (message) {
        if (message.length > 0) {
            if (message == "") {
                return;
            }
            queue.push(message);
        }
    }
}

mc.on("error", (error) => {
    console.error(error);
});

mc.on("end", () => {
    //console.log("Connection closed");
    process.exit();
});

async function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

mc.listen();