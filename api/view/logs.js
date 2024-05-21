import express from "express";
import db from "../../functions/db.js";
import logRoute from "../../functions/logRoute.js";
const router = express.Router();

router.post('/', async (req, res) => {
    logRoute(req, res);
    let logs = await db.getOne('messages')
    if (logs) {
        let things = [...logs];
        things = things.reverse();
        things = things.slice(parseInt(req.query.min), parseInt(req.query.max));
        return res.status(200).json(things);
    } else {
       return res.status(404).json({
           message: 'No logs found.',
           error: true
       });
    };
});

export default router;