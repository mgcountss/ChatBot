import express from "express";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import db from "../../functions/db.js";
import { calculateUser } from '../../functions/calculate.js';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\compare')[0];

router.get('/', async (req, res) => {
    try {
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
        let users = JSON.parse(JSON.stringify(await db.getOne('users')));
        let user1Data = users.find(x => x.id == user1);
        let user2Data = users.find(x => x.id == user2);
        user1Data = calculateUser(user1Data);
        user2Data = calculateUser(user2Data);
        if (!user1Data || !user2Data) {
            res.status(400).send({
                error: 'User not found',
                success: false
            });
            return;
        }
        res.render(__dirname + '/views/compare.ejs', {
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