import express from "express";
import logRoute from "../../functions/logRoute.js";
import db from "../../functions/db.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\currency')[0];

router.get('/', async (req, res) => {
    logRoute(req, res);
    return res.render(__dirname + '/views/public.ejs');
});

router.post('/', async (req, res) => {
    logRoute(req, res)
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
           res.status(400).send({
                error: 'You must provide a user ID',
                success: false
              });
        }
    } catch (err) {
        console.log(err);
        res.status(400).send({
            error: 'An error occurred',
            success: false
        });
    }
})

export default router;
