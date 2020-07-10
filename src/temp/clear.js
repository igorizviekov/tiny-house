"use strict";
//clear mock data to db
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = require("../database");
const clear = async () => {
    try {
        const db = await database_1.connectDB();
        const bookings = await db.bookings.find({}).toArray();
        const listings = await db.listings.find({}).toArray();
        const users = await db.users.find({}).toArray();
        if (bookings.length > 0) {
            await db.bookings.drop();
        }
        if (listings.length > 0) {
            await db.listings.drop();
        }
        if (users.length > 0) {
            await db.users.drop();
        }
    }
    catch (_a) {
        throw new Error("failed to clear database");
    }
};
clear();
