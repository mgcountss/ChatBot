import express from "express";
import db from "../../functions/db.js";
import logRoute from "../../functions/logRoute.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\currency')[0];

router.get('/', async (req, res) => {
    logRoute(req, res)
    try {
        if (req.query.id) {
            let currency = await db.getOne('users');
            let users = [...currency]
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
                res.render(__dirname + '/views/user.ejs', {
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

export default router;