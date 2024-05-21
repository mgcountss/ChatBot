import express from "express";
import db from "../../functions/db.js";
import logRoute from "../../functions/logRoute.js";
const router = express.Router();

router.post("/", async (req, res) => {
    logRoute(req, res);
    try {
        let counting = await db.getOne('counting');
        if (counting) {
            if (!counting.messages) {
                restoreLastBackup()
                return res.status(404).json({
                    message: 'No counting data found.',
                    error: true
                });
            };
            if (counting.messages.length > 3) {
                counting.messages = counting.messages.sort((a, b) => a.timestampUsec - b.timestampUsec);
                counting.users = counting.users.sort((a, b) => a.count - b.count);
                if (req.query.min && req.query.max) {
                    counting.messages = counting.messages.slice(parseInt(req.query.min), parseInt(req.query.max));
                } else {
                    counting.messages = counting.messages.slice(-10);
                }
            };
            return res.status(200).json(counting);
        } else {
            return res.status(404).json({
                message: 'No counting data found.',
                error: true
            });
        };
    } catch (error) {
        return res.status(500).json({
            message: 'An unknown error has occurred.',
            error: true
        });
    };
});

export default router;