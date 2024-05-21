import express from "express";
import db from "../../functions/db.js";
import checkLogin from "../../functions/checkLogin.js";
const router = express.Router();

router.put('/', (req, res, next) => {
    checkLogin(req, res, next, 2);
}, async (req, res) => {
    if (req.body.prize && req.body.entryRank && req.body.requirementAmount && req.body.requirementType && req.body.command) {
        let currentGiveaway = await db.getOne('giveaway');
        let giveaway = {
            enabled: currentGiveaway.enabled,
            winner: currentGiveaway.winner,
            prize: req.body.prize,
            entries: currentGiveaway.entries,
            entryRank: req.body.entryRank,
            requirementAmount: req.body.requirementAmount,
            requirementType: req.body.requirementType,
            command: req.body.command
        };
        await db.overwriteOne('giveaway', giveaway);
        return res.status(200).send({ success: true });
    } else if (req.body.clear) {
        let currentGiveaway = await db.getOne('giveaway');
        currentGiveaway.entries = [];
        currentGiveaway.winner = '';
        currentGiveaway.enabled = false;
        await db.overwriteOne('giveaway', currentGiveaway);
        return res.status(200).send({ success: true });
    } else if (req.body.reroll) {
        let currentGiveaway = await db.getOne('giveaway');
        currentGiveaway.winner = '';
        let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
        currentGiveaway.winner = winner;
        await db.overwriteOne('giveaway', currentGiveaway);
        return res.status(200).send({ success: true });
    } else if (req.body.start) {
        let currentGiveaway = await db.getOne('giveaway');
        currentGiveaway.enabled = true;
        await db.overwriteOne('giveaway', currentGiveaway);
        return res.status(200).send({ success: true });
    } else if (req.body.stop) {
        let currentGiveaway = await db.getOne('giveaway');
        currentGiveaway.enabled = false;
        let winner = currentGiveaway.entries[Math.floor(Math.random() * currentGiveaway.entries.length)];
        currentGiveaway.winner = winner;
        await db.overwriteOne('giveaway', currentGiveaway);
        return res.status(200).send({ success: true });
    } else {
        return res.status(400).send({ message: 'Missing required fields.' });
    };
});

export default router;