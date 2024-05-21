import db from "./db.js";
//0 = none, 1 = mod, 2 = admin, 3 = owner
async function checkLogin(req, res, next, permission) {
    if (await db.findUserIdFromToken(req.cookies['chatbot'])) {
        let user = await db.findUserIdFromToken(req.cookies['chatbot']);
        if (user.rank >= permission) {
            req.userID = user.id;
            next();
        } else {
            res.status(400).send({
                error: 'Insufficient permissions',
                success: false
            });
        };
    } else {
        res.status(400).send({
            error: 'Invalid token',
            success: false
        });
    };
};

export default checkLogin;