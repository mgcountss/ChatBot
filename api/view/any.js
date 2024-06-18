import express from "express";
import db from "../../functions/db.js";
const router = express.Router();

router.post('/', async (req, res) => {

    let sort = req.query.type;
    if (req.query.sort) {
        sort = req.query.sort;
        if (sort == "gain") {
            if ((!req.query.sortType) && (!req.query.sortTime)) {
                return res.status(400).json({
                    message: 'Missing sortType or sortTime.',
                    error: true
                });
            };
        };
    };
    if ((req.query.type == "users") || (req.query.type == "gain") || (req.query.type == "points")) {
        let users = await db.getOne('users');
        users = JSON.parse(JSON.stringify(users));
        if (users) {
            let things = [...users];
            if (things) {
                if (sort == "verified") {
                    sort = "isVerified";
                } else if (sort == "moderator") {
                    sort = "isModerator";
                } else if (sort == "owner") {
                    sort = "isOwner";
                } else if (sort == "lastmsg") {
                    sort = "lastMSG";
                };
                if (sort == "points" || sort == "messages" || sort == "hours" || sort == "lastMSG" || sort == "xp") {
                    if (sort == "lastMSG") {
                        things.sort((a, b) => {
                            return parseFloat(b["lastMSG"]) - parseFloat(a["lastMSG"])
                        });
                    } else {
                        things.sort((a, b) => {
                            return parseFloat(b[sort]) - parseFloat(a[sort])
                        });
                    };
                } else if (sort == "isVerified" || sort == "isModerator" || sort == "isOwner") {
                    things.sort((a, b) => {
                        return b[sort] - a[sort];
                    });
                };
                if (sort == "gain") {
                    for (let i = 0; i < things.length; i++) {
                        let gain = things[i][req.query.sortType];
                        if (Object.keys(things[i].dailyStats).length > parseFloat(req.query.sortTime)) {
                            let keys = Object.keys(things[i].dailyStats);
                            gain = parseFloat(things[i].dailyStats[keys[keys.length - 1]][req.query.sortType]) - parseFloat(things[i].dailyStats[keys[keys.length - (parseFloat(req.query.sortTime) + 1)]][req.query.sortType]);
                            things[i].gain = gain;
                            if ((new Date() * 1000) - parseFloat(things[i].lastMSG) > (parseFloat(req.query.sortTime) * 86400000000)) {
                                things[i].gain = 0;
                            };
                        } else {
                            things[i].gain = gain;
                        };
                    };
                    things.sort((a, b) => parseFloat(b['gain']) - parseFloat(a['gain']));
                };
                things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
                if (!req.query.lol) {
                    for (let i = 0; i < things.length; i++) {
                        delete things[i].cooldown;
                        delete things[i].dailyStats;
                        delete things[i].hourlyStats;
                        things[i].warns = things[i].warnings ? things[i].warnings : [];
                        things[i].warnings = things[i].warnings ? things[i].warnings.length : 0;
                    };
                };
                res.status(200).send(things);
            } else {
                return res.status(404).json({
                    message: 'No data found.',
                    error: true
                });
            };
        } else {
            return res.status(404).json({
                message: 'No data found.',
                error: true
            });
        };
    } else if (req.query.type == "votes") {
        let votes = await db.getOne('votes')
        votes = votes.sort((a, b) => {
            return parseFloat(b.votes) - parseFloat(a.votes)
        });
        if (votes) {
            let things = [...votes];
            if (things) {
                things.sort((a, b) => {
                    return parseFloat(b.count) - parseFloat(a.count);
                });
                things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
                res.status(200).send(things);
            } else {
                return res.status(404).json({
                    message: 'No data found.',
                    error: true
                });
            };
        } else {
            return res.status(404).json({
                message: 'No data found.',
                error: true
            });
        };
    };
});

export default router;