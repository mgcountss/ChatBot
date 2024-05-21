import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.delete('/', (req, res, next) => {
    checkLogin(req, res, next, 3);
}, async (req, res) => {
    if (req.body.id == undefined) {
        return res.status(400).send({ success: false, message: 'Missing id' });
    };
    await db.deleteFromArray('users', 'id', req.body.id);
    return res.status(200).send({ success: true });
});

export default router;