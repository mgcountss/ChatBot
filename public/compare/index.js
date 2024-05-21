import express from "express";
import logRoute from "../../functions/logRoute.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\compare')[0];

router.get('/', async (req, res) => {
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

export default router;