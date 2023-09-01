import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { stringify } from 'masterchat'
import { request } from 'undici';
import { fork } from 'child_process';
import cors from 'cors';
import db from './db.js';
const app = express();
app.use(cors());
let Child;
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//console.log("INDEX: " + process.memoryUsage().heapUsed / 1024 / 1024);

async function getStream(id, id2) {
    try {
        let url = 'https://www.youtube.com/watch?v=' + id2;
        const { body } = await request(url);
        let bodyText = await body.text();
        let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
        if (stream) {
            return JSON.parse(`
    {
        "stream": {
            "id": "${bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0]}",
            "title": "${bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0]}",
            "viewers": "${bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0]}",
            "likes": "${bodyText.split(`{"accessibility":{"accessibilityData":{"label":"`)[1].split(` likes"}`)[0]}"
        }
    }`);
        } else {
            let url = 'https://www.youtube.com/channel/' + id + '/live';
            const { body } = await request(url);
            let bodyText = await body.text();
            let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
            if (stream) {
                return JSON.parse(`
        {
            "stream": {
                "id": "${bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0]}",
                "title": "${bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0]}",
                "viewers": "${bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0]}",
                "likes": "${bodyText.split(`{"accessibility":{"accessibilityData":{"label":"`)[1].split(` likes"}`)[0]}"
            }
        }`);
            } else {
                return JSON.parse(`
        {
            "stream": null
        }`);
            }
        }
    } catch (e) {
        return JSON.parse(`
    {
        "stream": null
    }`);
    }
}

app.get('/', async (req, res) => {
    res.sendFile(__dirname + '/web/index.html');
});

app.get('/count', async (req, res) => {
    try {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let counting = await db.getOne(userID, 'counting')
            if (counting) {
                if (counting.messages.length > 3) {
                    counting.messages = counting.messages.sort((a, b) => a.timestampUsec - b.timestampUsec)
                    counting.users = counting.users.sort((a, b) => a.count - b.count)
                    counting.users = counting.users.slice(-10)
                }
                res.send(counting)
            } else {
                res.send('Unauthorized')
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/updatePlaylist', async (req, res) => {
    if (req.body.playlist && req.body.title && req.body.id) {
        if (req.cookies['chatbot']) {
            let userId = await db.findUserIdFromToken(req.cookies['chatbot']);
            if (userId) {
                let playlist = {
                    currentID: req.body.id,
                    currentTitle: req.body.title,
                    url: req.body.playlist
                }
                db.overwriteOne(userId, 'playlist', playlist)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.playlist) {
        if (req.cookies['chatbot']) {
            let userId = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentPlaylist = await db.getOne(userId, 'playlist')
            if (userId) {
                let playlist = {
                    currentID: currentPlaylist.currentID,
                    currentTitle: currentPlaylist.currentTitle,
                    url: req.body.playlist
                }
                db.overwriteOne(userId, 'playlist', playlist)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else {
        res.send({
            success: false
        })
    }
})

app.post('/editGiveaway', async (req, res) => {
    if (req.body.prize && req.body.entryRank && req.body.requirementAmount && req.body.requirementType && req.body.command) {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentGiveaway = await db.getOne(userID, 'giveaway')
            if (userID) {
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
                db.overwriteOne(userID, 'giveaway', giveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        } else {
            res.send('Unauthorized')
        }
    } else if (req.body.clear) {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentGiveaway = await db.getOne(userID, 'giveaway')
            if (userID) {
                currentGiveaway.entries = [];
                currentGiveaway.winner = '';
                currentGiveaway.enabled = false;
                db.overwriteOne(userID, 'giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.reroll) {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentGiveaway = await db.getOne(userID, 'giveaway')
            if (userID) {
                currentGiveaway.winner = '';
                let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
                currentGiveaway.winner = winner;
                db.overwriteOne(userID, 'giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.start) {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentGiveaway = await db.getOne(userID, 'giveaway')
            if (userID) {
                currentGiveaway.enabled = true;
                db.overwriteOne(userID, 'giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else if (req.body.stop) {
        if (req.cookies['chatbot']) {
            let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
            let currentGiveaway = await db.getOne(userID, 'giveaway')
            if (userID) {
                currentGiveaway.enabled = false;
                let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
                currentGiveaway.winner = winner;
                db.overwriteOne(userID, 'giveaway', currentGiveaway)
                res.send({ success: true })
            } else {
                res.send('Unauthorized')
            }
        }
    } else {
        res.send('Error')
    }
});

app.get('/giveaway', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let currentGiveaway = await db.getOne(userID, 'giveaway')
        if (userID) {
            for (let i = 0; i < currentGiveaway.entries.length; i++) {
                currentGiveaway.entries[i] = user.users.find(x => x.id == currentGiveaway.entries[i])
            }
            if (currentGiveaway.winner) {
                currentGiveaway.winner = user.users.find(x => x.id == currentGiveaway.winner)
            }
            res.send(currentGiveaway)
        } else {
            res.send('Unauthorized')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/points/:min/:max', async (req, res) => {
    let sort = "points"
    if (req.query.sort) {
        sort = req.query.sort
        if (sort == "gain") {
            if (req.query.sortType && req.query.sortTime) { } else {
                res.send('Error')
                return;
            }
        }
    }
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let users = await db.getOne(userID, 'users')
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
                if (sort == "points" || sort == "messages" || sort == "hours" || sort == "lastMSG") {
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
                            gain = (parseFloat(things[i][req.query.sortType]) - parseFloat(things[i].dailyStats[keys[keys.length - (parseFloat(req.query.sortTime) + 1)]][req.query.sortType]));
                            things[i].gain = gain;
                        } else {
                            things[i].gain = gain;
                        }
                    }
                    things.sort((a, b) => parseFloat(b['gain']) - parseFloat(a['gain']));
                }
                things = things.slice(parseInt(req.params.min), parseInt(req.params.max));
                if (!req.query.lol) {
                    for (let i = 0; i < things.length; i++) {
                        delete things[i].cooldown
                        delete things[i].dailyStats
                        delete things[i].hourlyStats
                        things[i].allWarns = things[i].allWarns ? things[i].allWarns.length : 0
                        things[i].warns = things[i].warns ? things[i].warns.length : 0
                    }
                }
                res.send(things)
            } else {
                res.send('Error')
            }
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.post('/search/:min/:max', async (req, res) => {
    if (req.body.search == undefined) return res.send('Error' + req.body.search)
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let users = await db.getOne(userID, 'users')
        if (users) {
            let things = [...users];
            let query = req.body.search.toLowerCase();
            let results = things.filter(x => x.name.toLowerCase().includes(query) || x.id.toLowerCase().includes(query));
            results = results.slice(parseInt(req.params.min), parseInt(req.params.max));
            res.send(results)
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.post('/removeUser', async (req, res) => {
    if (req.body.id == undefined) return res.send('Error')
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            db.deleteFromArray(userID, 'users', 'id', req.body.id)
            res.send({ success: true })
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/messages/:min/:max', async (req, res) => {
    let sort = "messages"
    if (req.query.sort) {
        sort = req.query.sort
    }
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let users = await db.getOne(userID, 'users')
        if (users) {
            let things = [...users];
            things.sort((a, b) => {
                return parseFloat(b[sort]) - parseFloat(a[sort])
            });
            things = things.slice(parseInt(req.params.min), parseInt(req.params.max));
            res.send(things)
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/votes/:min/:max', async (req, res) => {
    let sort = "votes"
    if (req.query.sort) {
        sort = req.query.sort
    }
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let votes = await db.getOne(userID, 'votes')
        if (userID) {
            let things = [...votes];
            things.sort((a, b) => {
                return parseFloat(b[sort]) - parseFloat(a[sort])
            });
            things = things.slice(parseInt(req.params.min), parseInt(req.params.max));
            res.send(things)
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.post('/checkforstream', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let stream = await db.getOne(userID, 'stream')
        if (userID) {
            getStream(userID, stream.id).then((stream2) => {
                if (stream2.stream) {
                    if (!livechats.includes(stream2.stream.id)) {
                        livechats.push(stream2.stream.id);
                        db.overwriteOne(userID, 'stream', {
                            id: stream2.stream.id,
                            title: stream2.stream.title,
                            thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                            live: true,
                            messages: stream.messages,
                            viewers: stream2.stream.viewers,
                            likes: stream2.stream.likes
                        });
                        Child = fork('chatbot.js', [userID, stream2.stream.id]);
                        Child.send('Hello from the parent!');
                        Child.on('exit', (code, signal) => {
                            console.log(`Child process exited with code ${code} and signal ${signal}`);
                            let stream = db.getOne(userID, 'stream')
                            let index = livechats.findIndex((stream2) => {
                                return stream2 == stream.id;
                            });
                            livechats.splice(index, 1);
                            children.splice(index, 1);
                            Child = fork('chatbot.js', [userID, stream.id]);
                        });
                    }
                    res.send({ "success": "true" })
                } else {
                    if (stream.live) {
                        if (stream.live) {
                            stream.live = false;
                            db.overwriteOne(userID, 'stream', stream)
                            let index = livechats.findIndex((stream) => {
                                return stream == user.stream.id;
                            });
                            livechats.splice(index, 1);
                            children[index].kill();
                            children.splice(index, 1);
                        }
                    }
                    res.send({ "failed": "true" })
                }
            })
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});


app.get('/logs/:min/:max', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let logs = await db.getOne(userID, 'logs')
        if (userID) {
            let things = [...logs];
            things = things.reverse();
            things = things.slice(parseInt(req.params.min), parseInt(req.params.max));
            res.send(things)
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/totals', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let users = await db.getOne(userID, 'users')
        let stream = await db.getOne(userID, 'stream')
        let votes = await db.getOne(userID, 'votes')
        if (userID && users && stream && votes) {
            let messages = stream.messages;
            let points = 0;
            let hours = 0;
            let voteCount = 0;
            for (let i = 0; i < users.length; i++) {
                points += parseFloat(users[i].points);
                hours += parseFloat(users[i].hours);
            }
            for (let i = 0; i < votes.length; i++) {
                voteCount += parseFloat(votes[i].votes);
            }
            res.send({
                messages: messages,
                points: points,
                hours: hours,
                users: users.length,
                votes: voteCount,
                likes: stream.likes
            })
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/votes', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let votes = await db.getOne(userID, 'votes')
        if (userID) {
            res.send(votes)
        } else {
            res.send('Error')
        }
    } else {
        res.send('Unauthorized')
    }
});

app.get('/countup.js', async (req, res) => {
    res.sendFile(__dirname + '/web/countup.js');
});
app.get('/odometer.js', async (req, res) => {
    res.sendFile(__dirname + '/web/odometer.js');
});
app.get('/odometer.css', async (req, res) => {
    res.sendFile(__dirname + '/web/odometer.css');
});

app.get('/dashboard', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let commands = await db.getOne(userID, 'commands')
        let connection = await db.getOne(userID, 'connection')
        let counting = await db.getOne(userID, 'counting')
        let currency = await db.getOne(userID, 'currency')
        let giveaway = await db.getOne(userID, 'giveaway')
        let messages = await db.getOne(userID, 'messages')
        let moderation = await db.getOne(userID, 'moderation')
        let playlist = await db.getOne(userID, 'playlist')
        let quotes = await db.getOne(userID, 'quotes')
        let settings = await db.getOne(userID, 'settings')
        let stream = await db.getOne(userID, 'stream')
        let timers = await db.getOne(userID, 'timers')
        let users = await db.getOne(userID, 'users')
        let votes = await db.getOne(userID, 'votes')
        let user = {
            id: userID,
            commands: commands,
            connection: connection,
            counting: counting,
            currency: currency,
            giveaway: giveaway,
            messages: messages,
            moderation: moderation,
            playlist: playlist,
            quotes: quotes,
            settings: settings,
            stream: stream,
            timers: timers,
            users: users,
            votes: votes
        }
        if (userID) {
            res.render(__dirname + '/web/dashboard.ejs', { user: user, stringify: stringify, relativeTime: relativeTime });
        } else {
            res.redirect('/connect');
        }
    } else {
        res.redirect('/connect');
    }
});

app.post('/addCommand', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let commands = await db.getOne(userID, 'commands')
        if (userID) {
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
                db.addObject(userID, 'commands', {
                    command: req.body.name,
                    response: req.body.response,
                    permission: req.body.rank,
                    cooldown: parseFloat(req.body.cooldown),
                    default: false,
                    used: 0,
                    id: randomStr8
                });
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

app.post('/addTimer', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let timers = await db.getOne(userID, 'timers')
        if (userID) {
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
                db.addObject(userID, 'timers', {
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

app.post('/editTimer', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let timers = await db.getOne(userID, 'timers')
        if (userID) {
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
                        db.removeObject(userID, 'timers', 'id', req.body.id);
                        db.addObject(userID, 'timers', {
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

app.post('/removeTimer', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let timers = await db.getOne(userID, 'timers')
        if (userID) {
            if (req.body.id) {
                for (let i = 0; i < timers.length; i++) {
                    if (timers[i].id == req.body.id) {
                        db.removeObject(userID, 'timers', 'id', req.body.id);
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

app.post('/removeCommand', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let commands = await db.getOne(userID, 'commands')
        if (userID) {
            if (req.body.name) {
                for (let i = 0; i < commands.length; i++) {
                    if (commands[i].command == req.body.name) {
                        db.removeObject(userID, 'commands', 'id', commands[i].id);
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

app.post('/editCommand', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot'])
        let commands = await db.getOne(userID, 'commands')
        if (userID) {
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
                        db.overwriteObjectInArray(userID, 'commands', 'id', commands[i].id, {
                            command: req.body.name,
                            response: req.body.response,
                            permission: req.body.rank,
                            cooldown: parseFloat(req.body.cooldown),
                            default: false,
                            used: (parseFloat(commands[i].used) + 1),
                            id: commands[i].id
                        });
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
                            db.overwriteObjectInArray(userID, 'commands', 'id', commands[i].id, {
                                command: commands[i].command,
                                response: commands[i].response,
                                permission: commands[i].permission,
                                cooldown: commands[i].cooldown,
                                default: commands[i].default,
                                used: parseFloat(req.body.used),
                                id: commands[i].id
                            });
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

app.get('/chat', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let messages = [...await db.getOne(userID, 'messages')]
        if (userID) {
            messages = messages.sort((a, b) => {
                return parseFloat(a.timestampUsec) - parseFloat(b.timestampUsec);
            });
            res.status(200).send({
                messages: messages.slice(-25),
                success: true
            });
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

app.get('/connect', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            res.redirect('/dashboard');
        } else {
            res.render(__dirname + '/web/connect.ejs');
        }
    } else {
        res.render(__dirname + '/web/connect.ejs');
    }
});

app.post('/connect', async (req, res) => {
    if (req.body.SSID && req.body.SID && req.body.HSID && req.body.APISID && req.body.SAPISID && req.body.channelID) {
        let users = fs.readdirSync('./users');
        for (let i = 0; i < users.length; i++) {
            if (users[i] == "key.json") continue;
            if (fs.existsSync('./users/' + users[i] + '')) {
                res.send({
                    error: 'Account already exists',
                    success: false
                })
                return;
            }
        }
        let url = "https://axern.space/api/youtube/channel/" + req.body.channelID;
        const { body } = await request(url);
        let bodyJson = await body.json();
        if (bodyJson) {
            let newUser = {
                "id": req.body.channelID,
                "created": new Date().getTime(),
                "status": 'offline',
                "connection": {
                    "connected": true,
                    "channel": {
                        "id": req.body.channelID,
                        "snippet": bodyJson.snippet
                    }
                },
                "messages": [],
                "stream": {
                    "id": "",
                    "title": "",
                    "thumbnail": "",
                    "live": false,
                    "messages": 0,
                    "viewers": "",
                    "likes": ""
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
                "playlist": {
                    "currentID": "",
                    "currentTitle": "",
                    "url": ""
                },
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
                },
                "currency": {
                    "minXP": 1,
                    "maxXP": 1,
                    "xpPerLevel": 100,
                    "customLevelNames": []
                }
            }
            fs.mkdirSync('./users/' + req.body.channelID);
            fs.mkdirSync('./users/' + req.body.channelID + '/db');
            fs.mkdirSync('./users/' + req.body.channelID + '/archives');
            fs.mkdirSync('./users/' + req.body.channelID + '/files');
            fs.mkdirSync('./users/' + req.body.channelID + '/streams');
            fs.writeFileSync('./users/' + req.body.channelID + '/db/commands.json', JSON.stringify(newUser.commands));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/connection.json', JSON.stringify(newUser.connection));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/counting.json', JSON.stringify(newUser.counting));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/currency.json', JSON.stringify(newUser.currency));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/giveaway.json', JSON.stringify(newUser.giveaway));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/messages.json', JSON.stringify(newUser.messages));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/moderation.json', JSON.stringify(newUser.moderation));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/playlist.json', JSON.stringify(newUser.playlist));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/quotes.json', JSON.stringify(newUser.quotes));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/settings.json', JSON.stringify(newUser.settings));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/stream.json', JSON.stringify(newUser.stream));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/timers.json', JSON.stringify(newUser.timers));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/users.json', JSON.stringify(newUser.users));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/votes.json', JSON.stringify(newUser.votes));
            fs.writeFileSync('./users/' + req.body.channelID + '/db/ids.json', JSON.stringify([]));
            let token = Math.random().toString(36).substring(7);
            let keys = JSON.parse(fs.readFileSync('./users/key.json'));
            keys[token] = newUser.id;
            fs.writeFileSync('./users/key.json', JSON.stringify(keys));
            fs.writeFile('./users/' + newUser.id + '/credentials.json', JSON.stringify({
                SAPISID: req.body.SAPISID,
                APISID: req.body.APISID,
                HSID: req.body.HSID,
                SID: req.body.SID,
                SSID: req.body.SSID
            }), (err) => { });
            res.cookie('chatbot', token, { maxAge: 31556952000, httpOnly: true });
            res.send({
                success: true
            })
        } else {
            res.send({
                error: 'Invalid channel ID',
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
    res.clearCookie('chatbot');
    res.redirect('/');
});

let livechats = [];
let children = [];
async function checkLiveChannels() {
    try {
        let users = fs.readdirSync('./users');
        users = users.filter((user) => {
            if (!fs.lstatSync('./users/' + user).isDirectory()) return;
            let settings = JSON.parse(fs.readFileSync('./users/' + user + '/db/settings.json'));
            if (settings.chatbot.enabled) {
                return true;
            }
        });
        if (users) {
            users.forEach((user) => {
                let connection = JSON.parse(fs.readFileSync('./users/' + user + '/db/connection.json'));
                let stream = JSON.parse(fs.readFileSync('./users/' + user + '/db/stream.json'));
                let userId = connection.channel.id;
                if (connection.channel) {
                    function redoThing(user, already) {
                        getStream(userId, stream.id).then((stream2) => {
                            if (stream2.stream) {
                                if (!livechats.includes(stream2.stream.id)) {
                                    let lcmessages = stream.messages;
                                    if (stream.id != stream2.stream.id) {
                                        lcmessages = 0;
                                    }
                                    livechats.push(stream2.stream.id);
                                    db.overwriteOne(userId, 'stream', {
                                        id: stream2.stream.id,
                                        title: stream2.stream.title,
                                        thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                                        live: true,
                                        messages: lcmessages,
                                        viewers: stream2.stream.viewers,
                                        likes: stream2.stream.likes,
                                    });
                                    console.log(userId)
                                    let Child = fork('chatbot.js', [userId, stream.id]);
                                    Child.send('Hello from the parent!');
                                    Child.on('exit', (code, signal) => {
                                        console.log(`Child process exited with code ${code} and signal ${signal}`);
                                        let index = livechats.findIndex((stream2) => {
                                            return stream2 == stream.id;
                                        });
                                        livechats.splice(index, 1);
                                        children.splice(index, 1);
                                        Child = fork('chatbot.js', [userId, stream.id]);
                                    });
                                    Child.on('error', (err) => {
                                        console.log(err);
                                    })
                                    children.push(Child);
                                }
                            } else {
                                if (!already) {
                                    redoThing(user, true);
                                } else {
                                    if (stream.live) {
                                        console.log('stream ended')
                                        stream.live = false;
                                        db.overwriteOne(userId, 'stream', stream);
                                        let index = livechats.findIndex((stream) => {
                                            return stream == stream.id;
                                        });
                                        if (index != -1) {
                                            livechats.splice(index, 1);
                                            children[index].kill();
                                            children.splice(index, 1);
                                            console.log('killed child')
                                            console.log(livechats)
                                            console.log(children)
                                        }
                                        redoThing(user, true);
                                    }
                                }
                            }
                        });
                    }
                    redoThing(user, false);
                }
            })
        }
    } catch (err) {
        console.log(err);
    }
}

app.post('/deleteMsg', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let stream = await db.getOne(userID, 'stream');
        if (userID) {
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

app.post('/timeout', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let stream = await db.getOne(userID, 'stream');
        if (userID) {
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

app.post('/ban', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let stream = await db.getOne(userID, 'stream');
        if (userID) {
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

app.post('/updateUser', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let users = await db.getOne(userID, 'users');
        if (userID) {
            let subject = users.find(x => x.id == req.body.id);
            if (subject) {
                if (req.body.type == 'warnings') {
                    db.editWithinArray(userID, 'users', 'id', req.body.id, 'warns', [])
                    db.editWithinArray(userID, 'users', 'id', req.body.id, 'allWarns', [])
                } else {
                    db.editWithinArray(userID, 'users', 'id', req.body.id, req.body.type, req.body.value);
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

app.post('/settings/moderation', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let moderation = await db.getOne(userID, 'moderation');
        if (userID) {
            moderation = req.body.moderation;
            db.overwriteOne(userID, 'moderation', moderation);
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

app.get('/settings/enable', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let settings = await db.getOne(userID, 'settings');
        let stream = await db.getOne(userID, 'stream');
        if (userID) {
            if (settings.chatbot.enabled == false) {
                settings.chatbot.enabled = true;
                db.overwriteOne(userID, 'settings', settings);
                getStream(userID, stream.id)
                res.status(200).send({
                    success: true,
                    enabled: 'enabled'
                });
            } else {
                settings.chatbot.enabled = false;
                db.overwriteOne(userID, 'settings', settings);
                let index = livechats.findIndex((stream) => {
                    return stream == user.stream.id;
                });
                if (index != -1) {
                    children[index].send("stop");
                }
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

app.get('/filestore/:file', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (userID) {
            let userDir = "./users/" + userID + "/files"
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
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    }
})

app.get('/counting/enable', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let settings = await db.getOne(userID, 'settings');
        if (userID) {
            if (settings.counting.enabled) {
                settings.counting.enabled = false;
                db.overwriteOne(userID, 'settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'disabled'
                });
            } else {
                settings.counting.enabled = true;
                db.overwriteOne(userID, 'settings', settings);
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

app.get('/currency/enable', async (req, res) => {
    if (req.cookies['chatbot']) {
        let userID = await db.findUserIdFromToken(req.cookies['chatbot']);
        let settings = await db.getOne(userID, 'settings');
        if (userID) {
            if (settings.currency.enabled) {
                settings.currency.enabled = false;
                db.overwriteOne(userID, 'settings', settings);
                res.status(200).send({
                    success: true,
                    enabled: 'disabled'
                });
            } else {
                settings.currency.enabled = true;
                db.overWriteOne(userID, 'settings', settings);
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

app.get('/public/currency/:id', async (req, res) => {
    let dir = './users/' + req.params.id + "/db/users.json";
    if (fs.existsSync(dir)) {
        let currency = JSON.parse(fs.readFileSync(dir));
        if (req.query.uid) {
            let user = currency.find(x => x.id == req.query.uid);
            if (user) {
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
        } else if (req.query.all) {
            if (req.query.sort) {
                currency = currency.sort((a, b) => {
                    return parseFloat(b[req.query.sort]) - parseFloat(a[req.query.sort]);
                });
            } else {
                currency = currency.sort((a, b) => {
                    return parseFloat(b.points) - parseFloat(a.points);
                });
            }
            for (let i = 0; i < currency.length; i++) {
                let dailyKeys = Object.keys(currency[i].dailyStats);
                try {
                currency[i].daily = {
                    points: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 2]].points),
                    messages: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 2]].messages)
                }
            } catch (err) {
                currency[i].daily = {
                    points: parseFloat(currency[i].points),
                    messages: parseFloat(currency[i].messages)
                }
            }
            try {
                currency[i].weekly = {
                    points: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 8]].points),
                    messages: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 8]].messages)
                }
            } catch (err) {
                currency[i].weekly = {
                    points: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(currency[i].dailyStats[dailyKeys[0]].points),
                    messages: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(currency[i].dailyStats[dailyKeys[0]].messages)
                }
            }
            try {
                currency[i].monthly = {
                    points: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 31]].points),
                    messages: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 31]].messages)
                }
            } catch (err) {
                currency[i].monthly = {
                    points: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].points) - parseFloat(currency[i].dailyStats[dailyKeys[0]].points),
                    messages: parseFloat(currency[i].dailyStats[dailyKeys[dailyKeys.length - 1]].messages) - parseFloat(currency[i].dailyStats[dailyKeys[0]].messages)
                }
            }
                delete currency[i].dailyStats;
                delete currency[i].hourlyStats;
                delete currency[i].hourly;
                delete currency[i].warns;
                delete currency[i].allWarns;
            }
            res.status(200).send({
                success: true,
                users: currency
            });
        } else {
            let limit = req.query.limit;
            let offset = req.query.offset;
            if (limit && offset) {
                if (req.query.sort) {
                    currency = currency.sort((a, b) => {
                        return parseFloat(b[req.query.sort]) - parseFloat(a[req.query.sort]);
                    });
                } else {
                    currency = currency.sort((a, b) => {
                        return parseFloat(b.points) - parseFloat(a.points);
                    });
                }
                let users = currency.slice(offset, limit);
                res.status(200).send({
                    success: true,
                    users: users
                });
            } else {
                res.status(400).send({
                    error: 'Missing limit or offset',
                    success: false
                });
            }
        }
    } else {
        res.status(400).send({
            error: 'Invalid ID or File not found',
            success: false
        });
    }
});

setInterval(checkLiveChannels, 1000 * 60 * 5);
checkLiveChannels();

app.listen(8080, () => {
    console.log('Server started on port 8080');
});