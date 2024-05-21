import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.delete('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let commands = await db.getOne('commands')
    if (req.body.name && req.body.response && req.body.rank && req.body.cooldown) {
        if (req.body.name.includes(' ')) {
            return res.status(400).send({
                error: 'Command name cannot contain spaces',
                success: false
            });
        };
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].command == req.body.name) {
                return res.status(400).send({
                    error: 'Command already exists',
                    success: false
                });
            };
        };
        let randomStr8 = Math.random().toString(36).substring(7);
        redo();
        async function redo() {
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].id == randomStr8) {
                    randomStr8 = Math.random().toString(36).substring(7);
                    redo();
                };
            };
        };
        let cmd = {
            command: req.body.name,
            response: req.body.response,
            permission: req.body.rank,
            cooldown: parseFloat(req.body.cooldown),
            default: false,
            used: 0,
            id: randomStr8
        };
        await db.addTo('commands', cmd);
        res.status(200).send({
            success: true
        });
    } else {
        res.status(400).send({
            error: 'Missing command, response, permission or cooldown',
            success: false
        });
    };
});

export default router;