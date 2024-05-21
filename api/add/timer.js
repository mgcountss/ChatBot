import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let timers = await db.getOne('timers');
    if (req.body.text && req.body.interval) {
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
        let randomStr8 = Math.random().toString(36).substring(7);
        redo();
        async function redo() {
            for (let i = 0; i < timers.length; i++) {
                if (timers[i].id == randomStr8) {
                    randomStr8 = Math.random().toString(36).substring(7);
                    redo();
                };
            };
        };
        await db.addTo('timers', {
            text: req.body.text,
            interval: parseFloat(req.body.interval),
            lastCalled: 0,
            enabled: true,
            id: randomStr8
        });
        return res.status(200).send({
            success: true
        });
    } else {
        return res.status(400).send({
            error: 'Missing text or interval',
            success: false
        });
    };
});

export default router;