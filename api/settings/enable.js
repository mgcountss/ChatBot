import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let settings = await db.getOne('settings');
    let stream = await db.getOne('stream');
    if (settings.chatbot.enabled == false) {
        settings.chatbot.enabled = true;
        await db.overwriteOne('settings', settings);
        getStream(stream.id)
        return res.status(200).send({
            success: true,
            enabled: 'enabled'
        });
    } else {
        settings.chatbot.enabled = false;
        await db.overwriteOne('settings', settings);
        return res.status(200).send({
            success: true,
            enabled: 'disabled'
        });
    };
});

export default router;