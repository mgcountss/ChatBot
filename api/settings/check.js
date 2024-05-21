import express from "express";
import checkLogin from "../../functions/checkLogin.js";
import { checkLiveChannels } from '../../functions/checkLiveChannels.js';
const router = express.Router();

router.post('/', (req, res, next) => {
    checkLogin(req, res, next, 3);
}, async (req, res) => {
    checkLiveChannels();
    return res.status(200).json({ success: true });
});

export default router;