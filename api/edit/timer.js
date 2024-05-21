import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.put('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let timers = await db.getOne('timers')
    if (req.body.id && req.body.text && req.body.interval && req.body.enabled) {
        if (isNaN(parseFloat(req.body.interval))) {
            return res.status(400).send({
                error: 'Interval must be a number',
                success: false
            });
        };
        if (parseFloat(req.body.interval) < 120) {
            return res.status(400).send({
                error: 'Interval must be at least 120 seconds',
                success: false
            });
        };
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
                return res.status(200).send({
                    success: true
                });
            };
        };
        return res.status(400).send({
            error: 'Timer does not exist',
            success: false
        });
    } else {
        return res.status(400).send({
            error: 'Missing timer, response, interval or enabled',
            success: false
        });
    };
});

export default router;