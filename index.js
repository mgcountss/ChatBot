import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { stringify } from 'masterchat'
import { request } from 'undici';
import cors from 'cors';
import db from './db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chatbot from './chatbot.js';
const app = express();
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
if (!fs.existsSync('./user')) {
    fs.mkdirSync('./user');
    fs.writeFileSync('./user/key.json', JSON.stringify({}));
}
let chat = await db.getOne('messages');
let currency = [];
setInterval(async () => {
    chat = await db.getOne('messages')
}, 5000)

const logRoute = (req, res) => {
    //console.log(req.method + ' ' + req.url, req['ip']);
}


/*---------------/api/view/-----------------*/
app.get('/api/view/counting', async (req, res) => {
    logRoute(req, res)
    try {
        let counting = await db.getOne('counting')
        if (counting) {
            if (!counting.messages) {
                restoreLastBackup()
                res.send('Error');
                return;
            }
            if (counting.messages.length > 3) {
                counting.messages = counting.messages.sort((a, b) => a.timestampUsec - b.timestampUsec)
                counting.users = counting.users.sort((a, b) => a.count - b.count)
                counting.users = counting.users.slice(-10)
            }
            res.send(counting)
        } else {
            res.send('Error')
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/view/giveaway', async (req, res) => {
    logRoute(req, res)
    let currentGiveaway = await db.getOne('giveaway')
    if (currentGiveaway) {
        if (currentGiveaway.entries) {
            for (let i = 0; i < currentGiveaway.entries.length; i++) {
                currentGiveaway.entries[i] = user.users.find(x => x.id == currentGiveaway.entries[i])
            }
            if (currentGiveaway.winner) {
                currentGiveaway.winner = user.users.find(x => x.id == currentGiveaway.winner)
            }
            res.send(currentGiveaway)
        }
    } else {
        res.send('Error')
    }
});

app.get('/api/view/logs', async (req, res) => {
    logRoute(req, res)
    let logs = await db.getOne('messages')
    if (logs) {
        let things = [...logs];
        things = things.reverse();
        things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
        res.send(things)
    } else {
        res.send('Error')
    }
});

app.get('/api/view/totals', async (req, res) => {
    logRoute(req, res)
    let users = await db.getOne('users')
    let stream = await db.getOne('stream')
    let votes = await db.getOne('votes')
    if (users && stream && votes) {
        let messages = stream.messages;
        let points = 0;
        let hours = 0;
        let xp = 0;
        let voteCount = 0;
        for (let i = 0; i < users.length; i++) {
            points += parseFloat(users[i].points);
            hours += parseFloat(users[i].hours);
            xp += parseFloat(users[i].xp);
        }
        for (let i = 0; i < votes.length; i++) {
            voteCount += parseFloat(votes[i].votes);
        }
        res.send({
            messages: messages,
            points: points,
            hours: hours,
            xp: xp,
            users: users.length,
            votes: voteCount
        })
    } else {
        res.send('Error')
    }
});

app.get('/api/view/chat', async (req, res) => {
    logRoute(req, res)
    try {
        let messages = chat;
        if (messages) {
            messages = [...messages]
            messages = messages.sort((a, b) => {
                return parseFloat(a.timestampUsec) - parseFloat(b.timestampUsec);
            });
            res.status(200).send({
                messages: messages.slice(-25),
                success: true
            });
        } else {
            res.status(401).send({
                error: 'unknown error',
                success: false
            });
        }
    } catch (e) {
        console.log(e)
        res.status(404).send({
            error: 'Not found',
            success: false
        });
    }
});

app.get('/api/view/votes', async (req, res) => {
    logRoute(req, res)
    let votes = await db.getOne('votes')
    if (votes) {
        res.send(votes)
    } else {
        res.send('Error')
    }
});

app.get('/api/view/any', async (req, res) => {
    logRoute(req, res)
    let sort = req.query.type
    if (req.query.sort) {
        sort = req.query.sort
        if (sort == "gain") {
            if (req.query.sortType && req.query.sortTime) { } else {
                res.send('Error')
                return;
            }
        }
    }
    if ((req.query.type == "users") || (req.query.type == "gain") || (req.query.type == "points")) {
        let users = await db.getOne('users');
        users = JSON.parse(JSON.stringify(users));

        if (users) {
            let things = [...users];
            if (things) {
                if (sort == "verified") {
                    sort = "isVerified"
                } else if (sort == "moderator") {
                    sort = "isModerator"
                } else if (sort == "owner") {
                    sort = "isOwner"
                } else if (sort == "lastmsg") {
                    sort = "lastMSG"
                }
                if (sort == "points" || sort == "messages" || sort == "hours" || sort == "lastMSG" || sort == "xp") {
                    if (sort == "lastMSG") {
                        things.sort((a, b) => {
                            return parseFloat(b["lastMSG"]) - parseFloat(a["lastMSG"])
                        });
                    } else {
                        things.sort((a, b) => {
                            return parseFloat(b[sort]) - parseFloat(a[sort])
                        });
                    }
                } else if (sort == "isVerified" || sort == "isModerator" || sort == "isOwner") {
                    things.sort((a, b) => {
                        return b[sort] - a[sort]
                    })
                }
                if (sort == "gain") {
                    for (let i = 0; i < things.length; i++) {
                        let gain = things[i][req.query.sortType];
                        if (Object.keys(things[i].dailyStats).length > parseFloat(req.query.sortTime)) {
                            let keys = Object.keys(things[i].dailyStats);
                            gain = parseFloat(things[i].dailyStats[keys[keys.length - 1]][req.query.sortType]) - parseFloat(things[i].dailyStats[keys[keys.length - (parseFloat(req.query.sortTime) + 1)]][req.query.sortType])
                            things[i].gain = gain;
                            if ((new Date() * 1000) - parseFloat(things[i].lastMSG) > (parseFloat(req.query.sortTime) * 86400000000)) {
                                things[i].gain = 0;
                            }
                        } else {
                            things[i].gain = gain;
                        }
                    }
                    things.sort((a, b) => parseFloat(b['gain']) - parseFloat(a['gain']));
                }
                things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
                if (!req.query.lol) {
                    for (let i = 0; i < things.length; i++) {
                        delete things[i].cooldown
                        delete things[i].dailyStats
                        delete things[i].hourlyStats
                        things[i].warns = things[i].warnings ? things[i].warnings : []
                        things[i].warnings = things[i].warnings ? things[i].warnings.length : 0
                    }
                }
                res.send(things)
            } else {
                res.send('Error')
            }
        } else {
            res.send('Error')
        }
    } else if (req.query.type == "votes") {
        let votes = await db.getOne('votes')
        votes = votes.sort((a, b) => {
            return parseFloat(b.votes) - parseFloat(a.votes)
        });
        if (votes) {
            let things = [...votes];
            if (things) {
                things.sort((a, b) => {
                    return parseFloat(b.count) - parseFloat(a.count)
                });
                things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
                res.send(things)
            } else {
                res.send('Error')
            }
        } else {
            res.send('Error')
        }
    }
});

//maybe change route
app.post('/api/view/search', async (req, res) => {
    logRoute(req, res)
    if (req.body.search == undefined) return res.send('Error' + req.body.search)
    let users = await db.getOne('users')
    if (users) {
        let things = [...users];
        let query = req.body.search.toLowerCase();
        let results = things.filter(x => x.name.toLowerCase().includes(query) || x.id.toLowerCase().includes(query));
        results = results.slice(parseInt(req.query.min), parseInt(req.query.max));
        for (let i = 0; i < results.length; i++) {
            delete results[i].cooldown
            delete results[i].dailyStats
            delete results[i].hourlyStats
            results[i].warns = results[i].warnings ? results[i].warnings : []
            results[i].warnings = results[i].warnings ? results[i].warnings.length : 0
        }
        res.send(results)
    } else {
        res.send('Error')
    }
});


/*---------------/api/edit/-----------------*/
app.post('/api/edit/giveaway', async (req, res) => {
    logRoute(req, res)
    if (req.body.prize && req.body.entryRank && req.body.requirementAmount && req.body.requirementType && req.body.command) {
        if (req.cookies['chatbot']) {
            if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
                let currentGiveaway = await db.getOne('giveaway')
                let giveaway = {
                    enabled: currentGiveaway.enabled,
                    winner: currentGiveaway.winner,
                    prize: req.body.prize,
                    entries: currentGiveaway.entries,
                    entryRank: req.body.entryRank,
                    requirementAmount: req.body.requirementAmount,
                    requirementType: req.body.requirementType,
                    command: req.body.command
                }
                await db.overwriteOne('giveaway', giveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        } else {
            res.send('Unauthorized')
        }
    } else if (req.body.clear) {
        if (req.cookies['chatbot']) {
            if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
                let currentGiveaway = await db.getOne('giveaway')
                currentGiveaway.entries = [];
                currentGiveaway.winner = '';
                currentGiveaway.enabled = false;
                await db.overwriteOne('giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.reroll) {
        if (req.cookies['chatbot']) {
            if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
                let currentGiveaway = await db.getOne('giveaway')
                currentGiveaway.winner = '';
                let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
                currentGiveaway.winner = winner;
                await db.overwriteOne('giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.start) {
        if (req.cookies['chatbot']) {
            let currentGiveaway = await db.getOne('giveaway')
            if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
                currentGiveaway.enabled = true;
                await db.overwriteOne('giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.stop) {
        if (req.cookies['chatbot']) {
            if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
                let currentGiveaway = await db.getOne('giveaway')
                currentGiveaway.enabled = false;
                let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
                currentGiveaway.winner = winner;
                await db.overwriteOne('giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else {
        res.send('Error')
    }
});

app.post('/api/edit/timer', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let timers = await db.getOne('timers')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.id && req.body.text && req.body.interval && req.body.enabled) {
                if (isNaN(parseFloat(req.body.interval))) {
                    res.status(400).send({
                        error: 'Interval must be a number',
                        success: false
                    });
                    return;
                }
                if (parseFloat(req.body.interval) < 120) {
                    res.status(400).send({
                        error: 'Interval must be at least 120 seconds',
                        success: false
                    });
                    return;
                }
                for (let i = 0; i < timers.length; i++) {
                    if (timers[i].id == req.body.id) {
                        await db.removeObject('timers', 'id', req.body.id);
                        await db.addTo('timers', {
                            text: req.body.text,
                            interval: parseFloat(req.body.interval),
                            lastCalled: 0,
                            enabled: req.body.enabled,
                            id: req.body.id
                        });
                        res.status(200).send({
                            success: true
                        });
                        return;
                    }
                }
                res.status(400).send({
                    error: 'Timer does not exist',
                    success: false
                });
            } else {
                res.status(400).send({
                    error: 'Missing timer, response, interval or enabled',
                    success: false
                });
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});

app.post('/api/edit/command', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let commands = await db.getOne('commands')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.name && req.body.response && req.body.rank && req.body.cooldown) {
                if (req.body.name.includes(' ')) {
                    res.status(400).send({
                        error: 'Command name cannot contain spaces',
                        success: false
                    });
                    return;
                }
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].command == req.body.name) {
                        let cmd = {
                            command: req.body.name,
                            response: req.body.response,
                            permission: req.body.rank,
                            cooldown: parseFloat(req.body.cooldown),
                            default: false,
                            used: (parseFloat(commands[i].used) + 1),
                            id: commands[i].id
                        }
                        await db.overwriteObjectInArray('commands', 'id', commands[i].id, cmd);
                        res.status(200).send({
                            success: true
                        });
                        return;
                    }
                }
                res.status(400).send({
                    error: 'Command does not exist',
                    success: false
                });
            } else {
                if (req.body.id && req.body.used) {
                    for (let i = 0; i < commands.length; i++) {
                        if (commands[i].id == req.body.id) {
                            let cmd = {
                                response: commands[i].response,
                                permission: commands[i].permission,
                                cooldown: commands[i].cooldown,
                                default: commands[i].default,
                                used: parseFloat(req.body.used),
                                id: commands[i].id
                            };
                            await db.overwriteObjectInArray('commands', 'id', commands[i].id, cmd);
                            res.status(200).send({
                                success: true
                            });
                        }
                    }
                } else {
                    res.status(400).send({
                        error: 'Missing command, response, permission or cooldown',
                        success: false
                    });
                }
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});

app.post('/api/edit/user', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let users = currency
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            let subject = users.find(x => x.id == req.body.id);
            if (subject) {
                if (req.body.type == 'warnings') {
                    await db.editWithinArray('users', 'id', req.body.id, 'warns', [])
                    await db.editWithinArray('users', 'id', req.body.id, 'allWarns', [])
                } else {
                    await db.editWithinArray('users', 'id', req.body.id, req.body.type, req.body.value);
                }
                res.status(200).send({
                    success: true
                });
            } else {
                res.status(400).send({
                    error: 'User not found',
                    success: false
                });
            }
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});


/*---------------/api/remove/-----------------*/
app.post('/api/remove/user', async (req, res) => {
    logRoute(req, res)
    if (req.body.id == undefined) return res.send('Error')
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            await db.deleteFromArray('users', 'id', req.body.id)
            res.send({ success: true })
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.post('/api/remove/timer', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let timers = await db.getOne('timers')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.id) {
                for (let i = 0; i < timers.length; i++) {
                    if (timers[i].id == req.body.id) {
                        await db.removeObject('timers', 'id', req.body.id);
                        res.status(200).send({
                            success: true
                        });
                        return;
                    }
                }
                res.status(400).send({
                    error: 'Timer does not exist',
                    success: false
                });
            } else {
                res.status(400).send({
                    error: 'Missing timer',
                    success: false
                });
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});

app.post('/api/remove/command', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let commands = await db.getOne('commands')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.name) {
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].command == req.body.name) {
                        await db.removeObject('commands', 'id', commands[i].id);
                        res.status(200).send({
                            success: true
                        });
                        return;
                    }
                }
                res.status(400).send({
                    error: 'Command does not exist',
                    success: false
                });
            } else {
                res.status(400).send({
                    error: 'Missing command',
                    success: false
                });
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});


/*---------------/api/add/-----------------*/

app.post('/api/add/timer', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let timers = await db.getOne('timers')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.text && req.body.interval) {
                if (isNaN(parseFloat(req.body.interval))) {
                    res.status(400).send({
                        error: 'Interval must be a number',
                        success: false
                    });
                    return;
                }
                if (parseFloat(req.body.interval) < 120) {
                    res.status(400).send({
                        error: 'Interval must be at least 120 seconds',
                        success: false
                    });
                    return;
                }
                let randomStr8 = Math.random().toString(36).substring(7);
                redo()
                async function redo() {
                    for (let i = 0; i < timers.length; i++) {
                        if (timers[i].id == randomStr8) {
                            randomStr8 = Math.random().toString(36).substring(7);
                            redo()
                        }
                    }
                }
                await db.addTo('timers', {
                    text: req.body.text,
                    interval: parseFloat(req.body.interval),
                    lastCalled: 0,
                    enabled: true,
                    id: randomStr8
                });
                res.status(200).send({
                    success: true
                });
            } else {
                res.status(400).send({
                    error: 'Missing text or interval',
                    success: false
                });
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});

app.post('/api/add/command', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let commands = await db.getOne('commands')
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (req.body.name && req.body.response && req.body.rank && req.body.cooldown) {
                if (req.body.name.includes(' ')) {
                    res.status(400).send({
                        error: 'Command name cannot contain spaces',
                        success: false
                    });
                    return;
                }
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].command == req.body.name) {
                        res.status(400).send({
                            error: 'Command already exists',
                            success: false
                        });
                        return;
                    }
                }
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
                let cmd = {
                    command: req.body.name,
                    response: req.body.response,
                    permission: req.body.rank,
                    cooldown: parseFloat(req.body.cooldown),
                    default: false,
                    used: 0,
                    id: randomStr8
                };
                await db.addTo('commands', cmd);
                res.status(200).send({
                    success: true
                });
            } else {
                res.status(400).send({
                    error: 'Missing command, response, permission or cooldown',
                    success: false
                });
            }
        } else {
            res.status(401).send({
                error: 'Unauthorized',
                success: false
            });
        }
    } else {
        res.status(401).send({
            error: 'Unauthorized',
            success: false
        });
    }
});


/*---------------/file/-----------------*/
app.get('/file/countup.js', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/countup.js');
});

app.get('/file/odometer.js', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/odometer.js');
});

app.get('/file/odometer.css', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/odometer.css');
});


/*---------------/main/-----------------*/
app.get('/', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/index.html');
});

app.get('/dashboard', async (req, res) => {
    logRoute(req, res)
    let key = ""
    if (req.cookies['chatbot']) {
        key = req.cookies['chatbot']
        let real = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (!real) {
            res.clearCookie('chatbot');
            res.redirect('/dashboard')
        }
    }
    let settings = await db.getOne('settings')
    if (settings == undefined) {
        res.redirect('/connect')
        return;
    }
    if (settings == {}) {
        restoreLastBackup()
    }
    let userAuth = await db.findUserIdFromToken(req.cookies['chatbot']);
    let commands = await db.getOne('commands')
    let connection = await db.getOne('connection')
    let counting = await db.getOne('counting')
    let giveaway = await db.getOne('giveaway')
    let messages = await db.getOne('messages')
    let moderation = await db.getOne('moderation')
    let quotes = await db.getOne('quotes')
    let stream = await db.getOne('stream')
    let timers = await db.getOne('timers')
    let users = await db.getOne('users')
    let votes = await db.getOne('votes')
    let user = {
        id: connection.channel.id,
        commands: commands,
        connection: connection,
        counting: counting,
        giveaway: giveaway,
        messages: messages,
        moderation: moderation,
        quotes: quotes,
        settings: settings,
        stream: stream,
        timers: timers,
        users: users,
        votes: votes
    }
    let auth = false;
    if (userAuth) {
        auth = true;
    }
    res.render(__dirname + '/web/dashboard.ejs', { user: user, stringify: stringify, relativeTime: relativeTime, auth: auth, res: res, key: key });
});

app.get('/connect', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            res.redirect('/restore')
        } else {
            res.render(__dirname + '/web/connect.ejs');
        }
    } else {
        res.render(__dirname + '/web/connect.ejs');
    }
});

app.get('/login', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/login.html');
});

app.get('/login/:token', async (req, res) => {
    logRoute(req, res)
    res.cookie('chatbot', req.params.token, { maxAge: 31556952000 });
    res.redirect('/dashboard')
});

app.get('/restore', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            let backups = fs.readdirSync('./user/archives');
            backups.sort(function (a, b) {
                return fs.statSync('./user/archives/' + b).mtime.getTime() -
                    fs.statSync('./user/archives/' + a).mtime.getTime();
            });
            res.render(__dirname + '/web/restore.ejs', { backups: backups });
        } else {
            res.redirect('/')
        }
    } else {
        res.render(__dirname + '/web/connect.ejs');
    }
});

app.get('/favicon.ico', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/favicon.ico');
});

app.post('/restore/:date', async (req, res) => {
    try {
        logRoute(req, res)
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            if (userID) {
                let backups = fs.readdirSync('./user/archives');
                if (backups.includes(req.params.date)) {
                    let file = fs.readFileSync('./user/archives/' + req.params.date);
                    let json = JSON.parse(file);
                    fs.writeFileSync('./user/db/commands.json', JSON.stringify(json.commands));
                    fs.writeFileSync('./user/db/connection.json', JSON.stringify(json.connection));
                    fs.writeFileSync('./user/db/counting.json', JSON.stringify(json.counting));
                    fs.writeFileSync('./user/db/giveaway.json', JSON.stringify(json.giveaway));
                    fs.writeFileSync('./user/db/ids.json', JSON.stringify(json.ids));
                    fs.writeFileSync('./user/db/messages.json', JSON.stringify(json.messages));
                    fs.writeFileSync('./user/db/moderation.json', JSON.stringify(json.moderation));
                    fs.writeFileSync('./user/db/settings.json', JSON.stringify(json.settings));
                    fs.writeFileSync('./user/db/stream.json', JSON.stringify(json.stream));
                    fs.writeFileSync('./user/db/timers.json', JSON.stringify(json.timers));
                    fs.writeFileSync('./user/db/users.json', JSON.stringify(json.users));
                    fs.writeFileSync('./user/db/votes.json', JSON.stringify(json.votes));
                    res.send({ success: true })
                } else {
                    res.status(404).send({ error: 'Not found' })
                }
            } else {
                res.status(401).send({ error: 'Unauthorized' })
            }
        } else {
            res.status(401).send({ error: 'Unauthorized' })
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({ error: 'Internal Server Error' })
    }
});

app.post('/connect', async (req, res) => {
    logRoute(req, res)
    if (req.body.channelID && req.body.botID) {
        let users = fs.readdirSync('./user');
        for (let i = 0; i < users.length; i++) {
            if (users[i] == "key.json") continue;
            if (fs.existsSync('./user')) {
                res.send({
                    error: 'Account already exists',
                    success: false
                })
                return;
            }
        }
        let bodyJson;
        let bodyJson2;
        async function getChannels() {
            try {
                let url = "https://axern.space/api/get?platform=youtube&type=channel&id=" + req.body.channelID;
                setTimeout(() => {
                    if (!bodyJson) {
                        res.status(400).send({
                            error: 'Streamer channel does not exist',
                            success: false
                        })
                        return;
                    }
                }, 10000);
                const { body } = await request(url);
                bodyJson = await body.json();
            } catch (e) {
                res.status(400).send({
                    error: 'Streamer channel does not exist',
                    success: false
                })
                return;
            }
            try {
                let url = "https://axern.space/api/get?platform=youtube&type=channel&id=" + req.body.botID;
                setTimeout(() => {
                    if (!bodyJson2) {
                        res.status(400).send({
                            error: 'Bot channel does not exist',
                            success: false
                        })
                        return;
                    }
                }, 10000);
                const { body } = await request(url);
                bodyJson2 = await body.json();
            } catch (e) {
                res.status(400).send({
                    error: 'Bot channel does not exist',
                    success: false
                })
                return;
            }
        }
        await getChannels();
        if (bodyJson && bodyJson2) {
            let newUser = {
                "id": req.body.channelID,
                "created": new Date().getTime(),
                "status": 'offline',
                "connection": {
                    "connected": true,
                    "channel": {
                        "id": req.body.channelID,
                        "snippet": bodyJson.snippet
                    },
                    "bot": {
                        "id": req.body.botID,
                        "snippet": bodyJson2.snippet
                    }
                },
                "messages": [],
                "stream": {
                    "id": "",
                    "title": "",
                    "thumbnail": "",
                    "live": false,
                    "messages": 0,
                    "viewers": ""
                },
                "commands": [
                    {
                        "command": "!math",
                        "response": "{authorName}, {math {query}}",
                        "default": true,
                        "permission": "everyone",
                        "cooldown": 0,
                        "id": "wgrnja",
                        "used": 0
                    },
                    {
                        "command": "!addcom",
                        "response": "{addCommand {query}}",
                        "permission": "moderator",
                        "cooldown": 0,
                        "default": true,
                        "id": "wgrnjb",
                        "used": 0
                    },
                    {
                        "command": "!delcom",
                        "response": "{deleteCommand {query}}",
                        "permission": "moderator",
                        "cooldown": 0,
                        "default": true,
                        "id": "wgrnjc",
                        "used": 0
                    },
                    {
                        "command": "!editcom",
                        "response": "{editCommand {query}}",
                        "permission": "moderator",
                        "cooldown": 0,
                        "default": true,
                        "id": "wgrnjd",
                        "used": 0
                    },
                    {
                        "command": "!quote",
                        "response": "{addQuote {query}}",
                        "permission": "moderator",
                        "cooldown": 0,
                        "default": true,
                        "id": "wgrnje",
                        "used": 0
                    },
                    {
                        "command": "!delquote",
                        "response": "{deleteQuote {query}}",
                        "permission": "moderator",
                        "cooldown": 0,
                        "default": true,
                        "id": "wganjt",
                        "used": 0
                    },
                    {
                        "command": "!points",
                        "response": "{authorName} {ifBlock {authorCustomRole}} has {authorPoints} points",
                        "default": true,
                        "used": 0,
                        "cooldown": 0,
                        "permission": "everyone",
                        "id": "wgrhjt"
                    },
                    {
                        "command": "!hours",
                        "response": "{authorName} {ifBlock {authorCustomRole}} has {authorHours} hours",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": true,
                        "used": 0,
                        "id": "84g53n"
                    },
                    {
                        "command": "!messages",
                        "response": "{authorName} {ifBlock {authorCustomRole}} has {authorMessages} messages",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": true,
                        "used": 0,
                        "id": "tauhzx"
                    },
                    {
                        "command": "!vote",
                        "response": "{authorName} {ifBlock {authorCustomRole}} voted for {vote {query}} ({math {voteCount {query}} + 1})",
                        "permission": "everyone",
                        "cooldown": 30,
                        "default": true,
                        "used": 2707,
                        "id": "8tuf4g"
                    },
                    {
                        "command": "!daily",
                        "response": "{authorName} has gained {authorDaily} points in the past 24 hours.",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": false,
                        "used": 0,
                        "id": "y7hprl"
                    },
                    {
                        "command": "!weekly",
                        "response": "{authorName} has gained {authorWeekly} points in the past week.",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": false,
                        "used": 0,
                        "id": "raj39ce"
                    },
                    {
                        "command": "!rank",
                        "response": "{ifBlock {authorCustomRole}}",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": false,
                        "used": 0,
                        "id": "kj7sdc"
                    },
                    {
                        "command": "!monthly",
                        "response": "{authorName} has gained {authorMonthly} points in the past month.",
                        "permission": "everyone",
                        "cooldown": 0,
                        "default": false,
                        "used": 35,
                        "id": "0bz3k5"
                    }
                ],
                "quotes": [],
                "timers": [],
                "users": [],
                "votes": [],
                "giveaway": {
                    "enabled": false,
                    "winner": "",
                    "prize": "",
                    "entries": [],
                    "entryRank": "everyone",
                    "requirementAmount": "0",
                    "requirementType": "points",
                    "command": "!join"
                },
                "counting": {
                    "messages": [],
                    "number": 0,
                    "lastMSG": 0,
                    "users": [],
                },
                "settings": {
                    "chatbot": {
                        "enabled": false
                    },
                    "counting": {
                        "enabled": true
                    },
                    "currency": {
                        "enabled": true
                    }
                },
                "moderation": {
                    "messagesPerMinute": "17",
                    "messagesPerMinuteEnabled": false,
                    "warnsBeforeTimeout": "3",
                    "messagesPer10Seconds": "4",
                    "messagesPer10SecondsEnabled": false,
                    "enabled": false
                }
            }
            fs.mkdirSync('./user/db');
            fs.mkdirSync('./user/archives');
            fs.mkdirSync('./user/files');
            fs.mkdirSync('./user/streams');
            fs.writeFileSync('./user/db/commands.json', JSON.stringify(newUser.commands));
            fs.writeFileSync('./user/db/connection.json', JSON.stringify(newUser.connection));
            fs.writeFileSync('./user/db/counting.json', JSON.stringify(newUser.counting));
            fs.writeFileSync('./user/db/giveaway.json', JSON.stringify(newUser.giveaway));
            fs.writeFileSync('./user/db/messages.json', JSON.stringify(newUser.messages));
            fs.writeFileSync('./user/db/moderation.json', JSON.stringify(newUser.moderation));
            fs.writeFileSync('./user/db/quotes.json', JSON.stringify(newUser.quotes));
            fs.writeFileSync('./user/db/settings.json', JSON.stringify(newUser.settings));
            fs.writeFileSync('./user/db/stream.json', JSON.stringify(newUser.stream));
            fs.writeFileSync('./user/db/timers.json', JSON.stringify(newUser.timers));
            fs.writeFileSync('./user/db/users.json', JSON.stringify(newUser.users));
            fs.writeFileSync('./user/db/votes.json', JSON.stringify(newUser.votes));
            fs.writeFileSync('./user/db/ids.json', JSON.stringify([]));
            let token = Math.random().toString(36)
            let keys = JSON.parse(fs.readFileSync('./user/key.json'));
            keys[token] = newUser.id;
            fs.writeFileSync('./user/key.json', JSON.stringify(keys));
            res.cookie('chatbot', token, { maxAge: 31556952000, httpOnly: true });
            res.send({
                success: true
            })
        } else {
            res.send({
                error: 'Invalid channel IDs',
                success: false
            })
        }
    } else {
        res.send({
            error: 'Missing some data',
            success: false
        })
    }
});

app.get('/logout', async (req, res) => {
    logRoute(req, res)
    res.clearCookie('chatbot');
    res.redirect('/');
});

app.post('/api/checkforstream', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        console.log('has cookies')
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            console.log('is logged in')
            endStream()
            res.send({ success: true })
        } else {
            res.send('Error')
            console.log('is not logged in')
        }
    } else {
        res.send('Error')
        console.log('has no cookies')
    }
});


/*---------------/api/chat/-----------------*/
app.post('/api/chat/deleteMsg', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let stream = await db.getOne('stream');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            let index = livechats.findIndex((stream2) => {
                return stream2 == stream.id;
            });
            if (index == -1) {
                console.log(livechats)
                res.status(400).send({
                    error: 'Stream not found',
                    success: false
                });
            } else {
                children[index].send("delete___" + req.body.id);
                res.status(200).send({
                    success: true
                });
            }
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});

app.post('/api/chat/timeout', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let stream = await db.getOne('stream');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            let index = livechats.findIndex((stream2) => {
                return stream2 == stream.id;
            });
            children[index].send("timeout___" + req.body.id);
            res.status(200).send({
                success: true
            });
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});

app.post('/api/chat/ban', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let stream = await db.getOne('stream');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            let index = livechats.findIndex((stream2) => {
                return stream2 == stream.id;
            });
            children[index].send("ban___" + req.body.id);
            res.status(200).send({
                success: true
            });
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});


/*---------------/api/settings/-----------------*/
app.post('/api/settings/moderation', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let moderation = await db.getOne('moderation');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            moderation = req.body.moderation;
            await db.overwriteOne('moderation', moderation);
            res.status(200).send({
                success: true
            });
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
})

app.get('/api/settings/enable', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let settings = await db.getOne('settings');
        let stream = await db.getOne('stream');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (settings.chatbot.enabled == false) {
                settings.chatbot.enabled = true;
                await db.overwriteOne('settings', settings);
                getStream(stream.id)
                res.status(200).send({
                    success: true,
                    enabled: 'enabled'
                });
            } else {
                settings.chatbot.enabled = false;
                await db.overwriteOne('settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'disabled'
                });
            }
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});

app.get('/api/settings/counting', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let settings = await db.getOne('settings');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (settings.counting.enabled) {
                settings.counting.enabled = false;
                await db.overwriteOne('settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'disabled'
                });
            } else {
                settings.counting.enabled = true;
                await db.overwriteOne('settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'enabled'
                });
            }
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
});

app.get('/api/settings/currency', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let settings = await db.getOne('settings');
        if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
            if (settings.currency.enabled) {
                settings.currency.enabled = false;
                await db.overwriteOne('settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'disabled'
                });
            } else {
                settings.currency.enabled = true;
                await db.overWriteOne('settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'enabled'
                });
            }
        } else {
            res.status(400).send({
                error: 'Invalid token',
                success: false
            });
        }
    }
});

app.get('/filestore/:file', async (req, res) => {
    logRoute(req, res)
    if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
        let userDir = "./user/files"
        let file = req.params.file;
        let path = userDir + "/" + file;
        if (fs.existsSync(path)) {
            res.sendFile(path, { root: __dirname });
        } else {
            res.status(404).send({
                error: 'File not found',
                success: false
            });
        }
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
})


/*---------------/public/-----------------*/
app.get('/public/live/chat/:id', async (req, res) => {
    logRoute(req, res)
    let dir = './user/db/messages.json';
    if (fs.existsSync(dir)) {
        let messages = JSON.parse(fs.readFileSync(dir));
        messages = messages.sort((a, b) => {
            return b.timestampUsec - a.timestampUsec;
        });
        messages = messages.slice(0, 15);
        res.send(messages);
    } else {
        res.status(404).send({
            error: 'Not found',
            success: false
        });
    }
});

app.get('/public/currency', async (req, res) => {
    logRoute(req, res)
    res.render(__dirname + '/web/public.ejs');
});

app.get('/public/compare/search', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/compare.html');
});

app.get('/public/compare', async (req, res) => {
    try {
        logRoute(req, res);
        let user1 = req.query.id1;
        let user2 = req.query.id2;
        if (!user1 || !user2) {
            res.status(400).send({
                error: 'Missing user(s)',
                success: false
            });
            return;
        }
        if (user1 == user2) {
            res.status(400).send({
                error: 'Cannot compare the same user',
                success: false
            });
            return;
        }
        let users = currency
        let user1Data = users.find(x => x.id == user1);
        let user2Data = users.find(x => x.id == user2);
        let dailyKeys1 = Object.keys(user1Data.dailyStats);
        try {
            user1Data.daily = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 2]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 2]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 2]].xp)
            }
        } catch (err) {
            user1Data.daily = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].xp)
            }
        }
        try {
            user1Data.weekly = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 8]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 8]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 8]].xp)
            }
        } catch (err) {
            user1Data.weekly = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].xp)
            }
        }
        try {
            user1Data.monthly = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 31]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 31]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 31]].xp)
            }
        } catch (err) {
            user1Data.monthly = {
                points: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].points) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].points),
                messages: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].messages) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].messages),
                xp: parseFloat(user1Data.dailyStats[dailyKeys1[dailyKeys1.length - 1]].xp) - parseFloat(user1Data.dailyStats[dailyKeys1[0]].xp)
            }
        }
        if (user1Data.lastMSG) {
            if ((Date.now() * 1000) - (user1Data.lastMSG) > 86400000000) {
                user1Data.daily = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
            if ((Date.now() * 1000) - (user1Data.lastMSG) > 604800000000000) {
                user1Data.weekly = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
            if ((Date.now() * 1000) - (user1Data.lastMSG) > 2592000000000) {
                user1Data.monthly = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
        }
        let dailyKeys2 = Object.keys(user2Data.dailyStats);
        try {
            user2Data.daily = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 2]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 2]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 2]].xp)
            }
        } catch (err) {
            user2Data.daily = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].xp)
            }
        }
        try {
            user2Data.weekly = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 8]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 8]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 8]].xp)
            }
        } catch (err) {
            user2Data.weekly = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].xp)
            }
        }
        try {
            user2Data.monthly = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 31]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 31]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 31]].xp)
            }
        } catch (err) {
            user2Data.monthly = {
                points: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].points) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].points),
                messages: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].messages) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].messages),
                xp: parseFloat(user2Data.dailyStats[dailyKeys2[dailyKeys2.length - 1]].xp) - parseFloat(user2Data.dailyStats[dailyKeys2[0]].xp)
            }
        }
        if (user2Data.lastMSG) {
            if ((Date.now() * 1000) - (user2Data.lastMSG) > 86400000000) {
                user2Data.daily = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
            if ((Date.now() * 1000) - (user2Data.lastMSG) > 604800000000000) {
                user2Data.weekly = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
            if ((Date.now() * 1000) - (user2Data.lastMSG) > 2592000000000) {
                user2Data.monthly = {
                    points: 0,
                    messages: 0,
                    xp: 0
                }
            }
        }
        if (!user1Data || !user2Data) {
            res.status(400).send({
                error: 'User not found',
                success: false
            });
            return;
        }
        res.render(__dirname + '/web/compare.ejs', {
            user1: user1Data,
            user2: user2Data
        });
    } catch (err) {
        console.log(err);
        res.status(400).send({
            error: 'Something went wrong',
            success: false
        });
    }
});

app.get('/public/currency/user', async (req, res) => {
    logRoute(req, res)
    try {
        if (req.query.id) {
            let users = currency
            let user = users.find(x => x.id == req.query.id);
            if (!user.dailyStats) {
                console.log('no daily stats')
                user.dailyStats = {};
                user.dailyStats[`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`] = {
                    messages: user.messages,
                    points: user.points,
                    xp: user.xp
                }
                db.editWithinArray('users', user.id, 'dailyStats', user.dailyStats);
            }
            let dailyKeys = Object.keys(user.dailyStats);
            try {
                user.daily = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 2]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 2]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 2]].xp)
                }
            } catch (err) {
                user.daily = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[0]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[0]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[0]].xp)
                }
            }
            try {
                user.weekly = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 8]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 8]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 8]].xp)
                }
            } catch (err) {
                user.weekly = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[0]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[0]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[0]].xp)
                }
            }
            try {
                user.monthly = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 31]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 31]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 31]].xp)
                }
            } catch (err) {
                user.monthly = {
                    points: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(user.dailyStats[dailyKeys[0]].points),
                    messages: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(user.dailyStats[dailyKeys[0]].messages),
                    xp: parseFloat(user.dailyStats[dailyKeys[dailyKeys.length - 1]].xp) - parseFloat(user.dailyStats[dailyKeys[0]].xp)
                }
            }
            if (user.lastMSG) {
                if ((Date.now() * 1000) - (user.lastMSG) > 86400000000) {
                    user.daily = {
                        points: 0,
                        messages: 0,
                        xp: 0
                    }
                }
                if ((Date.now() * 1000) - (user.lastMSG) > 604800000000000) {
                    user.weekly = {
                        points: 0,
                        messages: 0,
                        xp: 0
                    }
                }
                if ((Date.now() * 1000) - (user.lastMSG) > 2592000000000) {
                    user.monthly = {
                        points: 0,
                        messages: 0,
                        xp: 0
                    }
                }
            }
            if (user) {
                res.render(__dirname + '/web/user.ejs', {
                    user: user
                });
            } else {
                res.status(400).send({
                    error: 'User not found',
                    success: false
                });
            }
        } else {
            res.status(400).send({
                error: 'Missing id',
                success: false
            });
        }
    } catch (err) {
        console.log(err);
        res.status(400).send({
            error: 'Something went wrong',
            success: false
        });
    }
});

app.post('/public/currency', async (req, res) => {
    let t = new Date();
    logRoute(req, res)
    try {
        if (req.query.uid) {
            let users = JSON.parse(JSON.stringify(currency));
            let user = users.find(x => x.id == req.query.uid);
            if (user) {
                delete user.dailyStats;
                delete user.warns;
                delete user.allWarns;
                delete user.cooldown;
                res.status(200).send({
                    success: true,
                    user: user
                });
            } else {
                res.status(400).send({
                    error: 'User not found',
                    success: false
                });
            }
        } else {
            if (!req.query.search) {
                req.query.search = '';
            }
            let total = currency.length;
            let users = [...currency].filter((user) => {
                return (user.name.toLowerCase().includes(req.query.search.toLowerCase())) || (user.id.toLowerCase().includes(req.query.search.toLowerCase()));
            });
            let limit = req.query.limit;
            let offset = req.query.offset;
            if (limit && offset) {
                limit = parseInt(limit);
                offset = parseInt(offset);
                if (req.query.sort) {
                    if ((req.query.sort == 'dailyPoints') || (req.query.sort == 'dailyMessages') || (req.query.sort == 'dailyXP') || (req.query.sort == 'weeklyPoints') || (req.query.sort == 'weeklyMessages') || (req.query.sort == 'weeklyXP') || (req.query.sort == 'monthlyPoints') || (req.query.sort == 'monthlyMessages') || (req.query.sort == 'monthlyXP')) {
                        if (req.query.sort.includes('Points')) {
                            req.query.sort = req.query.sort.replace('Points', '');
                            users = users.sort((a, b) => {
                                return parseFloat(b[req.query.sort].points) - parseFloat(a[req.query.sort].points);
                            });
                        } else if (req.query.sort.includes('Messages')) {
                            req.query.sort = req.query.sort.replace('Messages', '');
                            users = users.sort((a, b) => {
                                return parseFloat(b[req.query.sort].messages) - parseFloat(a[req.query.sort].messages);
                            });
                        } else if (req.query.sort.includes('XP')) {
                            req.query.sort = req.query.sort.replace('XP', '');
                            users = users.sort((a, b) => {
                                return parseFloat(b[req.query.sort].xp) - parseFloat(a[req.query.sort].xp);
                            });
                        }
                    } else {
                        users = users.sort((a, b) => {
                            return parseFloat(b[req.query.sort]) - parseFloat(a[req.query.sort]);
                        });
                    }
                    if (req.query.order == 'asc') {
                        users = users.reverse();
                    }
                }
                users = users.slice(offset, offset + limit);
                res.status(200).send({
                    success: true,
                    users: users,
                    total: total
                });
                //console.log(new Date() - t);
            } else {
                res.status(400).send({
                    error: 'Missing limit or offset',
                    success: false
                });
            }
        }
    } catch (err) {
        console.log(err);
        res.status(400).send({
            error: 'Something went wrong',
            success: false
        });
    }
});

function calculateDifference(dailyStats, key, daysAgo, currencyLength) {
    try {
        let toReturn = parseFloat(Object.values(dailyStats)[currencyLength - 1][key]) - parseFloat(Object.values(dailyStats)[currencyLength - daysAgo][key]);
        if (isNaN(toReturn)) {
            return 0;
        } else {
            return toReturn;
        }
    } catch (err) {
        return 0;
    }
}

function calculateDaily(user) {
    try {
        user.daily = {
            points: calculateDifference(user.dailyStats, 'points', 2, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 2, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 2, Object.keys(user.dailyStats).length),
        };
    } catch (err) { }
}

function calculateWeekly(user) {
    try {
        user.weekly = {
            points: calculateDifference(user.dailyStats, 'points', 8, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 8, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 8, Object.keys(user.dailyStats).length),
        };
    } catch (err) { }
}

function calculateMonthly(user) {
    try {
        user.monthly = {
            points: calculateDifference(user.dailyStats, 'points', 31, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 31, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 31, Object.keys(user.dailyStats).length),
        };
    } catch (err) { }
}

function resetIfInactive(user) {
    const currentTime = Date.now() * 1000;
    if (user.lastMSG) {
        if (currentTime - user.lastMSG > 86400000000) {
            user.daily = { points: 0, messages: 0, xp: 0 };
        }
        if (currentTime - user.lastMSG > 604800000000) {
            user.weekly = { points: 0, messages: 0, xp: 0 };
        }
        if (currentTime - user.lastMSG > 2592000000000) {
            user.monthly = { points: 0, messages: 0, xp: 0 };
        }
    }
}

function relativeTime(previous) {
    if (previous === 0) {
        return "never"
    }
    previous = parseInt(previous) / 1000;
    const date = new Date();
    const timestamp = date.getTime();
    previous = Math.floor(previous / 1000)
    const difference = Math.floor(timestamp / 1000) - previous;
    let output = ``;
    if (difference < 60) {
        if (difference === 1) {
            output = `${difference} second ago`;
        } else {
            output = `${difference} seconds ago`;
        }
    } else if (difference < 3600) {
        if (difference === 1) {
            output = `${Math.floor(difference / 60)} minute ago`;
        } else {
            output = `${Math.floor(difference / 60)} minutes ago`;
        }
    } else if (difference < 86400) {
        if (difference === 1) {
            output = `${Math.floor(difference / 3600)} hour ago`;
        } else {
            output = `${Math.floor(difference / 3600)} hours ago`;
        }
    } else if (difference < 2620800) {
        if (difference === 1) {
            output = `${Math.floor(difference / 86400)} day ago`;
        } else {
            output = `${Math.floor(difference / 86400)} days ago`;
        }
    } else if (difference < 31449600) {
        if (difference === 1) {
            output = `${Math.floor(difference / 2620800)} month ago`;
        } else {
            output = `${Math.floor(difference / 2620800)} months ago`;
        }
    } else {
        if (difference === 1) {
            output = `${Math.floor(difference / 31449600)} year ago`;
        } else {
            output = `${Math.floor(difference / 31449600)} years ago`;
        }
    }
    return output;
}

function restoreLastBackup() {
    let backups = fs.readdirSync('./user/archives');
    backups.sort(function (a, b) {
        return fs.statSync('./user/archives/' + b).mtime.getTime() - fs.statSync('./user/archives/' + a).mtime.getTime();
    });
    let file = fs.readFileSync('./user/archives/' + backups[0]);
    let json = JSON.parse(file);
    fs.writeFileSync('./user/db/commands.json', JSON.stringify(json.commands));
    fs.writeFileSync('./user/db/connection.json', JSON.stringify(json.connection));
    fs.writeFileSync('./user/db/counting.json', JSON.stringify(json.counting));
    fs.writeFileSync('./user/db/giveaway.json', JSON.stringify(json.giveaway));
    fs.writeFileSync('./user/db/ids.json', JSON.stringify(json.ids));
    fs.writeFileSync('./user/db/messages.json', JSON.stringify(json.messages));
    fs.writeFileSync('./user/db/moderation.json', JSON.stringify(json.moderation));
    fs.writeFileSync('./user/db/settings.json', JSON.stringify(json.settings));
    fs.writeFileSync('./user/db/stream.json', JSON.stringify(json.stream));
    fs.writeFileSync('./user/db/timers.json', JSON.stringify(json.timers));
    fs.writeFileSync('./user/db/users.json', JSON.stringify(json.users));
    fs.writeFileSync('./user/db/votes.json', JSON.stringify(json.votes));
}

function endStream() {
    checkLiveChannels();
    return true;
}

async function checkLiveChannels() {
    try {
        if (!fs.existsSync('./user/db')) return false;
        let settings = JSON.parse(fs.readFileSync('./user/db/settings.json'));
        if (settings && settings.chatbot) {
            if (!settings.chatbot.enabled) {
                return false;
            }
        }
        let connection = JSON.parse(fs.readFileSync('./user/db/connection.json'));
        let stream = JSON.parse(fs.readFileSync('./user/db/stream.json'));
        if (connection.channel) {
            function redoThing(already) {
                if ((stream.id != "") && (stream.id != undefined) && (stream.id != null) && (stream.id.length > 0)) {
                    if (already) {
                        stream.id = "";
                    }
                }
                getStream(connection.channel.id, stream.id).then(async (stream2) => {
                    console.log(stream2)
                    if (stream2.stream) {
                        if (chatbot.isLive == false) {
                            let lcmessages = stream.messages;
                            await db.overwriteOne('stream', {
                                id: stream2.stream.id,
                                title: stream2.stream.title,
                                thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                                live: true,
                                messages: lcmessages,
                                viewers: stream2.stream.viewers
                            });
                            //Child = fork('chatbot.js', [connection.channel.id, stream2.stream.id, connection.bot.id]);
                            //Child.send('Hello from the parent!');
                            //Child.on('exit', (code, signal) => {
                            //    console.log(`Child process exited with code ${code} and signal ${signal}`);
                            //    Child = ""
                            //     checkLiveChannels();
                            //  });
                            //   Child.on('error', (err) => {
                            //       console.log(err);
                            //    })
                            chatbot.startBot(stream2.stream.id, connection.bot.id);
                        } else {
                            await db.overwriteOne('stream', {
                                id: stream2.stream.id,
                                title: stream2.stream.title,
                                thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                                live: true,
                                messages: stream.messages,
                                viewers: stream2.stream.viewers
                            });
                        }
                    } else {
                        if (!already) {
                            redoThing(true);
                        } else {
                            if (stream.live) {
                                console.log('stream ended')
                                stream.live = false;
                                await db.overwriteOne('stream', stream);
                            }
                        }
                    }
                });
            }
            redoThing(false);
        }
    } catch (err) {
        console.log(err);
    }
}

async function cachePublic() {
    try {
        let users = await db.getOne('users');
        users = [...users]
        users = JSON.parse(JSON.stringify(users));
        for (let i = 0; i < users.length; i++) {
            calculateDaily(users[i]);
            calculateWeekly(users[i]);
            calculateMonthly(users[i]);
            resetIfInactive(users[i]);
            delete users[i].hourlyStats;
            delete users[i].warns;
            delete users[i].allWarns;
            delete users[i].cooldown;
            //delete users[i].dailyStats;
        }
        currency = users;
        fs.writeFileSync('./user/publicCurrencyCache.json', JSON.stringify(users));
    } catch (err) {
        console.log(err);
    }
}

async function getStream(id, id2) {
    try {
        let url = 'https://www.youtube.com/watch?v=' + id2;
        const { body } = await request(url);
        let bodyText = await body.text();
        let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
        if (stream) {
            let id = bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0];
            let title = bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0];
            let viewers = bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0];
            return {
                "stream": {
                    "id": id,
                    "title": title,
                    "viewers": viewers,
                }
            };
        } else {
            let url = 'https://www.youtube.com/channel/' + id + '/live';
            //let url = 'https://www.youtube.com/watch?v=pnZ8bRsjSAs'// + id2;
            const { body } = await request(url);
            let bodyText = await body.text();
            let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
            if (stream) {
                let id = bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0];
                let title = bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0];
                let viewers = bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0];
                return {
                    "stream": {
                        "id": id,
                        "title": title,
                        "viewers": viewers,
                    }
                };
            } else {
                return ({ "stream": null });
            }
        }
    } catch (e) {
        console.log(e)
        return ({ "stream": null });
    }
}

cachePublic();
checkLiveChannels();
setInterval(cachePublic, 10000);

app.listen(8080, () => {
    console.log('Server started: http://localhost:8080');
});