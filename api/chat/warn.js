import express from "express";
import db from "../../functions/db.js";
import chatbot from '../../chatbot.js';
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    try {
        console.log(req.userID)
        let user = await db.findOne('users', 'id', req.body.id);
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                error: true
            });
        }
        if (!user.warnings) {
            user.warnings = [];
        }
        user.warnings.push({
            reason: req.body.reason,
            date: new Date().getTime(),
            by: req.userID
        });
        await db.overwriteObjectInArray('users', 'id', user.id, user);
        if (user.warnings.length >= 5) {
            chatbot.action('ban', user.id)
        }
        return res.status(200).send({
            success: true
        });
    } catch (e) {
        return res.status(500).json({
            message: 'Internal server error.',
            error: true
        });
    }
});

export default router;