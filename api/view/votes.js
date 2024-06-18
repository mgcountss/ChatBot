import express from "express";
import db from "../../functions/db.js";

const router = express.Router();

router.post('/', async (req, res) => {

    let votes = await db.getOne('votes');
    if (votes) {
        return res.status(200).json(votes);
    } else {
        return res.status(404).json({
            message: 'No votes data found.',
            error: true
        });
    };
});

export default router;