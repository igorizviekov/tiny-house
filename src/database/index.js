"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const url = `${process.env.DB}`;
exports.connectDB = async () => {
    const client = await mongodb_1.MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = client.db(`${process.env.DB_NAME}`);
    return {
        listings: db.collection(`${process.env.LISTINGS_COLLECTION}`),
        users: db.collection(`${process.env.USERS_COLLECTION}`),
        bookings: db.collection(`${process.env.BOOKINGS_COLLECTION}`)
    };
};
