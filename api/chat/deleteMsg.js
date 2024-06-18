import express from "express";
import action from "../../chatbot.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {

    action('delete', req.body.id);
    return res.status(200).send({
        success: true
    });
});

export default router;