import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.delete('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let timers = await db.getOne('timers');
    if (req.body.id) {
        for (let i = 0; i < timers.length; i++) {
            if (timers[i].id == req.body.id) {
                await db.removeObject('timers', 'id', req.body.id);
                return res.status(200).send({
                    success: true
                });
            };
        };
        res.status(400).send({
            error: 'Timer does not exist',
            success: false
        });
    } else {
        res.status(400).send({
            error: 'Missing timer',
            success: false
        });
    };
});

export default router;