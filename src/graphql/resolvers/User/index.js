"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResolvers = void 0;
const utils_1 = require("../../../lib/utils");
exports.userResolvers = {
    Query: {
        user: async (_root, { id }, { db, req }) => {
            try {
                const user = await db.users.findOne({ _id: id });
                if (!user) {
                    throw new Error("No user found.");
                }
                // authorize user
                const viewer = await utils_1.authorize(db, req);
                if (viewer && viewer._id === user._id) {
                    user.authorized = true;
                }
                return user;
            }
            catch (err) {
                throw new Error(err);
            }
        }
    },
    User: {
        id: (user) => user._id,
        hasWallet: (user) => Boolean(user.walletId),
        income: (user) => user.authorized ? user.income : null,
        bookings: async (user, { limit, page }, { db }) => {
            try {
                if (!user.authorized) {
                    return undefined;
                }
                const data = {
                    total: 0,
                    result: []
                };
                //pagination
                let cursor = await db.bookings.find({ _id: { $in: user.bookings } });
                cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
                cursor = cursor.limit(limit);
                data.total = await cursor.count();
                data.result = await cursor.toArray();
                return data;
            }
            catch (err) {
                throw new Error(err);
            }
        },
        listings: async (user, { limit, page }, { db }) => {
            try {
                const data = {
                    total: 0,
                    result: []
                };
                //pagination
                let cursor = await db.listings.find({ _id: { $in: user.listings } });
                cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
                cursor = cursor.limit(limit);
                data.total = await cursor.count();
                data.result = await cursor.toArray();
                return data;
            }
            catch (err) {
                throw new Error(err);
            }
        }
    }
};
