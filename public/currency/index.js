import express from "express";

import db from "../../functions/db.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\currency')[0];
if (dirname(__filename).includes('/public/currency')) {
    __dirname = dirname(__filename).split('/public/currency')[0];
}

router.get('/', async (req, res) => {
    return res.render(__dirname + '/views/public.ejs');
});

router.post('/', async (req, res) => {
    try {
        if (req.query.uid) {
            let currency = await db.getOne('users');
            currency = [...currency];
            let users = JSON.parse(JSON.stringify(currency));
            let user = users.find(x => x.id == req.query.uid);
            if (user) {
                delete user.dailyStats;
                delete user.warns;
                delete user.cooldown;
                delete user.hourlyStats;
                return res.status(200).send({
                    success: true,
                    user: user
                });
            } else {
                return res.status(400).send({
                    error: 'User not found',
                    success: false
                });
            };
        } else if (req.query.search) {
            let currency = await db.getOne('users');
            currency = [...currency];
            let users = JSON.parse(JSON.stringify(currency));
            let usersFound = users.filter(x => x.name.toLowerCase().includes(req.query.search.toLowerCase()) || x.id.toLowerCase() == req.query.search.toLowerCase());
            if (usersFound.length > 0) {
                usersFound.forEach(user => {
                    delete user.dailyStats;
                    delete user.warns;
                    delete user.cooldown;
                    delete user.hourlyStats;
                });
                return res.status(200).send({
                    success: true,
                    users: usersFound
                });
            } else {
                return res.status(400).send({
                    error: 'User not found',
                    success: false
                });
            };
        } else {
            return res.status(400).send({
                error: 'No query provided',
                success: false
            });
        };
    } catch (err) {
        console.log(err);
        return res.status(400).send({
            error: 'An error occurred',
            success: false
        });
    };
});

export default router;
