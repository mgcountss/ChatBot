import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.put('/', (req, res, next) => {
    checkLogin(req, res, next, 3);
}, async (req, res) => {
    let currency = await db.getOne('users');
    let users = [...currency];
    let subject = users.find(x => x.id == req.body.id);
    if (subject) {
        if (req.body.type == 'warnings') {
            await db.editWithinArray('users', 'id', req.body.id, 'warns', []);
        } else {
            await db.editWithinArray('users', 'id', req.body.id, req.body.type, req.body.value);
        };
        return res.status(200).send({
            success: true
        });
    } else {
        return res.status(400).send({
            error: 'User not found',
            success: false
        });
    };
});

export default router;