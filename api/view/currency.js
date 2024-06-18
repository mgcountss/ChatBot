import express from "express";
import db from "../../functions/db.js";
import {calculateUser} from '../../functions/calculate.js';

const router = express.Router();

router.post('/', async (req, res) => {
    
    let currency = await db.getOne('users');
    currency = [...currency];
    try {
        if (req.query.uid) {
            let users = JSON.parse(JSON.stringify(currency));
            let user = users.find(x => x.id == req.query.uid);
            if (user) {
                delete user.dailyStats;
                delete user.warns;
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
                for (let i = 0; i < users.length; i++) {
                    let user = users[i];
                    if (!user.dailyStats) {
                        user.dailyStats = {};
                        user.dailyStats[`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`] = {
                            messages: user.messages,
                            points: user.points,
                            xp: user.xp
                        }
                    }
                    user = calculateUser(user);
                    delete user.dailyStats;
                    delete user.warns;
                    delete user.cooldown;
                }
                res.status(200).send({
                    success: true,
                    users: users,
                    total: total
                });
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

export default router;