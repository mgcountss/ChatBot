import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { stringify } from 'masterchat'
import fetch from 'node-fetch';
import cors from 'cors';
import db from './functions/db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {checkLiveChannels} from './functions/checkLiveChannels.js';
import logRoute from './functions/logRoute.js';
import checkLogin from './functions/checkLogin.js';
import * as child_process from 'child_process';
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

fs.readdirSync('./api').forEach(async (folder) => {
    fs.readdirSync('./api/' + folder).forEach(async (file) => {
        const route = await import('./api/' + folder + '/' + file);
        app.use('/api/' + folder + '/' + file.split('.')[0], route.default);
    });
});

fs.readdirSync('./public').forEach(async (folder) => {
    fs.readdirSync('./public/' + folder).forEach(async (file) => {
        if (file !== 'index.js') {
            const route = await import('./public/' + folder + '/' + file);
            app.use('/public/' + folder + '/' + file.split('.')[0], route.default);
        } else {
            const route = await import('./public/' + folder + '/' + file);
            app.use('/public/' + folder, route.default);
        }
    });
});

app.get('/file/:file', async (req, res) => {
    logRoute(req, res);
    if (req.params.file == 'countup.js' || req.params.file == 'odometer.js' || req.params.file == 'odometer.css') {
        res.sendFile(__dirname + '/web/' + req.params.file);
    } else {
        res.status(404).send('Not found');
    };
});

app.get('/filestore/:file', checkLogin, async (req, res) => {
    logRoute(req, res);
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
    };
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
            return res.redirect('/dashboard');
        }
    }
    let settings = await db.getOne('settings')
    if (settings == undefined) {
        return res.redirect('/connect')
    }
    if (settings == {}) {
        restoreLastBackup()
    }
    let userAuth = await db.findUserIdFromToken(req.cookies['chatbot']);
    if (!userAuth) {
        return res.redirect('/connect')
    }
    let commands = await db.getOne('commands')
    let connection = await db.getOne('connection')
    let counting = await db.getOne('counting')
    let giveaway = await db.getOne('giveaway')
    let messages = await db.getOne('messages')
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
    res.render(__dirname + '/views/dashboard.ejs', { user: user, stringify: stringify, relativeTime: relativeTime, auth: auth, res: res, key: key });
});

app.get('/connect', async (req, res) => {
    logRoute(req, res)
    if (req.cookies['chatbot']) {
        let user = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (user) {
            if (user.owner == true) {
                res.redirect('/restore')
            } else {
                res.redirect('/dashboard')
            };
        } else {
            res.sendFile(__dirname + '/web/connect.html');
        };
    } else {
        res.sendFile(__dirname + '/web/connect.html');
    };
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

app.get('/default.webp', async (req, res) => {
    logRoute(req, res)
    res.sendFile(__dirname + '/web/default.webp');
});

app.post('/restore/:date', async (req, res) => {
    try {
        logRoute(req, res)
        if (req.cookies['chatbot']) {
            let user = await db.findUserIdFromToken(req.cookies['chatbot']);
            if (user) {
                if (user.owner == true) {
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
                bodyJson = await fetch(url).then(res => res.json());
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
                bodyJson2 = await fetch(url).then(res => res.json());
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
            let newUser = JSON.parse(fs.readFileSync('./defaultUser.json'));
            newUser.id = req.body.channelID;
            newUser.created = Date.now();
            newUser.connection = {
                connected: false,
                channel: {
                    id: req.body.channelID,
                    snippet: bodyJson.snippet
                },
                bot: {
                    id: req.body.botID,
                    snippet: bodyJson2.snippet
                }
            }
            fs.mkdirSync('./user/archives');
            fs.mkdirSync('./user/files');
            fs.mkdirSync('./user/streams');
            fs.writeFileSync('./user/db/commands.json', JSON.stringify(newUser.commands));
            fs.writeFileSync('./user/db/connection.json', JSON.stringify(newUser.connection));
            fs.writeFileSync('./user/db/counting.json', JSON.stringify(newUser.counting));
            fs.writeFileSync('./user/db/giveaway.json', JSON.stringify(newUser.giveaway));
            fs.writeFileSync('./user/db/messages.json', JSON.stringify(newUser.messages));
            fs.writeFileSync('./user/db/quotes.json', JSON.stringify(newUser.quotes));
            fs.writeFileSync('./user/db/settings.json', JSON.stringify(newUser.settings));
            fs.writeFileSync('./user/db/stream.json', JSON.stringify(newUser.stream));
            fs.writeFileSync('./user/db/timers.json', JSON.stringify(newUser.timers));
            fs.writeFileSync('./user/db/users.json', JSON.stringify(newUser.users));
            fs.writeFileSync('./user/db/votes.json', JSON.stringify(newUser.votes));
            fs.writeFileSync('./user/db/ids.json', JSON.stringify([]));
            let token = Math.random().toString(36);
            if (!fs.existsSync('./user/key.json')) {
                fs.writeFileSync('./user/key.json', '{}');
            }
            let keys = JSON.parse(fs.readFileSync('./user/key.json'));
            keys[token] = {
                id: newUser.id,
                rank: 3
            };
            fs.writeFileSync('./user/key.json', JSON.stringify(keys));
            res.cookie('chatbot', token, { maxAge: 31556952000, httpOnly: true });
            await db.syncDBToFiles();
            //make a new child process of an electron instance of /functions/login.js
            child_process.exec('electron ./functions/login.js', (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            });
            
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
    fs.writeFileSync('./user/db/settings.json', JSON.stringify(json.settings));
    fs.writeFileSync('./user/db/stream.json', JSON.stringify(json.stream));
    fs.writeFileSync('./user/db/timers.json', JSON.stringify(json.timers));
    fs.writeFileSync('./user/db/users.json', JSON.stringify(json.users));
    fs.writeFileSync('./user/db/votes.json', JSON.stringify(json.votes));
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
        }
        fs.writeFileSync('./user/publicCurrencyCache.json', JSON.stringify(users));
    } catch (err) {
        console.log(err);
    }
}

cachePublic();
checkLiveChannels();
setInterval(cachePublic, 10000);

app.listen(8080, () => {
    console.log('Server started: http://localhost:8080');
});