import express from "express";
import db from "../../functions/db.js";

const router = express.Router();

router.post('/', async (req, res) => {

    let currentGiveaway = await db.getOne('giveaway');
    if (currentGiveaway) {
        if (currentGiveaway.entries) {
            for (let i = 0; i < currentGiveaway.entries.length; i++) {
                currentGiveaway.entries[i] = user.users.find(x => x.id == currentGiveaway.entries[i]);
            }
            if (currentGiveaway.winner) {
                currentGiveaway.winner = user.users.find(x => x.id == currentGiveaway.winner);
            }
            return res.status(200).json(currentGiveaway);
        } else {
            return res.status(404).json({
                message: 'No giveaway data found.',
                error: true
            });
        };
    } else {
        return res.status(404).json({
            message: 'No giveaway data found.',
            error: true
        });
    };
});

export default router;