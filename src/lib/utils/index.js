"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
exports.authorize = async (db, req) => {
    //token is passed  from the client. check if  it is the same with  user
    const token = req.get("x-scrf-token");
    const viewer = await db.users.findOne({ token: token });
    return viewer;
};
