import express from "express";
import db from "../../functions/db.js";

const router = express.Router();

router.post('/', async (req, res) => {

    let users = await db.getOne('users');
    if (users) {
        let things = [...users];
        let query = req.body.search.toLowerCase();
        let results = things.filter(x => x.name.toLowerCase().includes(query.toLowerCase()) || x.id.toLowerCase() == (query));
        if ((req.query.sort == "name")) {
            results = results.sort((a, b) => (a[req.query.sort] > b[req.query.sort]) ? 1 : -1);
        } else if ((req.query.sort == "warnings")) {
            results = results.sort((a, b) => (a[req.query.sort].length < b[req.query.sort].length) ? 1 : -1);
        } else if ((req.query.sort == "moderator") || (req.query.sort == "verified") || (req.query.sort == "owner") || (req.query.sort == "customRank")) {
            let trueResults = results.filter(x => x[req.query.sort] == true);
            let falseResults = results.filter(x => x[req.query.sort] == false);
            results = trueResults.concat(falseResults);
        } else {
            results = results.sort((a, b) => (a[req.query.sort] < b[req.query.sort]) ? 1 : -1);
        }
        results = results.slice(parseInt(req.query.min), parseInt(req.query.max));
        for (let i = 0; i < results.length; i++) {
            delete results[i].cooldown;
            delete results[i].dailyStats;
            delete results[i].hourlyStats;
            results[i].warns = results[i].warnings ? results[i].warnings : [];
            results[i].warnings = results[i].warnings ? results[i].warnings.length : 0;
        }
        return res.status(200).send(results);
    } else {
        return res.status(404).json({
            message: 'No data found.',
            error: true
        });
    };
});

export default router;