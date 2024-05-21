import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.put('/', (req, res, next) => {
    checkLogin(req, res, next, 1);
}, async (req, res) => {
    let commands = await db.getOne('commands');
    if (req.body.name && req.body.response && req.body.rank && req.body.cooldown) {
        if (req.body.name.includes(' ')) {
            return res.status(400).send({
                error: 'Command name cannot contain spaces',
                success: false
            });
        };
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].command == req.body.name) {
                let cmd = {
                    command: req.body.name,
                    response: req.body.response,
                    permission: req.body.rank,
                    cooldown: parseFloat(req.body.cooldown),
                    default: false,
                    used: (parseFloat(commands[i].used) + 1),
                    id: commands[i].id
                };
                await db.overwriteObjectInArray('commands', 'id', commands[i].id, cmd);
                return res.status(200).send({
                    success: true
                });
            };
        };
        return res.status(400).send({
            error: 'Command does not exist',
            success: false
        });
    } else {
        if (req.body.id && req.body.used) {
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].id == req.body.id) {
                    let cmd = {
                        response: commands[i].response,
                        permission: commands[i].permission,
                        cooldown: commands[i].cooldown,
                        default: commands[i].default,
                        used: parseFloat(req.body.used),
                        id: commands[i].id
                    };
                    await db.overwriteObjectInArray('commands', 'id', commands[i].id, cmd);
                    return res.status(200).send({
                        success: true
                    });
                };
            };
        } else {
            return res.status(400).send({
                error: 'Missing command, response, permission or cooldown',
                success: false
            });
        };
    };
});

export default router;