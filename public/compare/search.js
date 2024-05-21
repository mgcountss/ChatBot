import express from "express";
import logRoute from "../../functions/logRoute.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename).split('\\public\\compare')[0];

router.get('/', async (req, res) => {
    logRoute(req, res);
    return res.sendFile(__dirname + '/views/compare.html');
});

export default router;