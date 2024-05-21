import express from "express";
import checkLogin from "../../functions/checkLogin.js";
import chatbot from "../../chatbot.js";
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    chatbot.action('timeout', req.body.id);
    return res.status(200).send({
        success: true
    });
});

export default router;