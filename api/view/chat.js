import express from "express";
import db from "../../functions/db.js";
import logRoute from "../../functions/logRoute.js";
const router = express.Router();

router.post('/', async (req, res) => {
    logRoute(req, res);
    try {
        let messages = await db.getOne('messages');
        if (messages) {
            messages = [...messages];
            messages = messages.sort((a, b) => {
                return parseFloat(a.timestampUsec) - parseFloat(b.timestampUsec);
            });
            return res.status(200).send({
                messages: messages.slice(-25),
                success: true
            });
        } else {
            return res.status(404).json({
                message: 'No messages found.',
                error: true
            });
        };
    } catch (e) {
        console.log(e)
        return res.status(500).json({
            message: 'An error occurred.',
            error: true
        });
    };
});

export default router;