import express from "express";
import db from "../../functions/db.js";
import logRoute from "../../functions/logRoute.js";
const router = express.Router();

router.post("/", async (req, res) => {
    logRoute(req, res);
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
            points += parseFloat(users[i].points);
            hours += parseFloat(users[i].hours);
            xp += parseFloat(users[i].xp);
        }
        for (let i = 0; i < votes.length; i++) {
            voteCount += parseFloat(votes[i].votes);
        }
        return res.status(200).json(stats);
    } else {
        return res.status(404).json({
            message: 'No data found.',
            error: true
        });
    };
});

export default router;