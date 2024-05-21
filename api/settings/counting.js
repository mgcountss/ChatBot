import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.get('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let settings = await db.getOne('settings');
    if (settings.counting.enabled) {
        settings.counting.enabled = false;
        await db.overwriteOne('settings', settings);
        return res.status(200).send({
            success: true,
            enabled: 'disabled'
        });
    } else {
        settings.counting.enabled = true;
        await db.overwriteOne('settings', settings);
        return res.status(200).send({
            success: true,
            enabled: 'enabled'
        });
    };
});

export default router;