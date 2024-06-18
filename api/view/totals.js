import express from "express";
import db from "../../functions/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
    let users = await db.getOne('users');
    let stream = await db.getOne('stream');
    let votes = await db.getOne('votes');
    if (users && stream && votes) {
        let stats = {
            messages: stream.messages,
            users: users.length,
            points: 0,
            hours: 0,
            xp: 0,
            votes: 0
        };
        for (let i = 0; i < users.length; i++) {
            stats.points += parseFloat(users[i].points);
            stats.hours += parseFloat(users[i].hours);
            stats.xp += parseFloat(users[i].xp);
        }
        for (let i = 0; i < votes.length; i++) {
            stats.voteCount += parseFloat(votes[i].votes);
        }
        return res.status(200).json(stats);
    } else {
        return res.status(404).json({
            message: 'No data found.',
            error: true
        });
    };
} catch (error) {
    console.error(error);
    return res.status(500).json({
        message: 'Internal server error.',
        error: true
    });
}
});

export default router;