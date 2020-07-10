"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authResolvers = void 0;
const api_1 = require("../../../lib/api");
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../../../lib/utils");
const loginViaGoogle = async (code, token, db) => {
    var _a, _b, _c;
    const { user } = await api_1.Google.login(code);
    if (!user) {
        throw new Error("Google login error");
    }
    //Name/Photo/Email Lists
    const userNamesList = user.names && ((_a = user.names) === null || _a === void 0 ? void 0 : _a.length) ? user.names : null;
    const userPhotosList = user.photos && ((_b = user.photos) === null || _b === void 0 ? void 0 : _b.length) ? user.photos : null;
    const userEmailsList = user.emailAddresses && ((_c = user.emailAddresses) === null || _c === void 0 ? void 0 : _c.length)
        ? user.emailAddresses
        : null;
    //user display name
    const userName = userNamesList ? userNamesList[0].displayName : null;
    //user id
    const userId = userNamesList &&
        userNamesList[0].metadata &&
        userNamesList[0].metadata.source
        ? userNamesList[0].metadata.source.id
        : null;
    //user avatar
    const userAvatar = userPhotosList && userPhotosList[0].url ? userPhotosList[0].url : null;
    //user email
    const userEmail = userEmailsList && userEmailsList[0].value ? userEmailsList[0].value : null;
    if (!userId || !userName || !userAvatar || !userEmail) {
        throw new Error("Google login error");
    }
    const updateUser = await db.users.findOneAndUpdate({ _id: userId }, {
        $set: {
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            token
        }
    }, { returnOriginal: false });
    let viewer = updateUser.value;
    if (!viewer) {
        const insertUser = await db.users.insertOne({
            _id: userId,
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            token,
            income: 0,
            bookings: [],
            listings: []
        });
        viewer = insertUser.ops[0];
    }
    return viewer;
};
const loginViaCookie = async (cookie, token, db) => {
    try {
        if (cookie) {
            const updatedRes = await db.users.findOneAndUpdate({ _id: cookie }, { $set: { token } }, { returnOriginal: false });
            const viewer = updatedRes.value;
            if (!viewer) {
                return;
            }
            return viewer;
        }
        return undefined;
    }
    catch (err) {
        throw new Error(err);
    }
};
exports.authResolvers = {
    Query: {
        authUrl: () => {
            try {
                return api_1.Google.authUrl;
            }
            catch (err) {
                throw new Error(err);
            }
        }
    },
    Mutation: {
        login: async (_root, { input }, { db }) => {
            try {
                const code = input ? input.code : null;
                const cookie = input ? input.cookie : "";
                const token = crypto_1.default.randomBytes(16).toString("hex");
                const viewer = code
                    ? //if no code  string from google try to log  in with cookie
                        await loginViaGoogle(code, token, db)
                    : await loginViaCookie(cookie, token, db);
                if (!viewer) {
                    return { didRequest: true };
                }
                return {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walletId: viewer.walletId,
                    didRequest: true
                };
            }
            catch (err) {
                throw new Error(err);
            }
        },
        logout: () => {
            return { didRequest: true };
        },
        connectStripe: async (_root, { input }, { db, req }) => {
            try {
                const { code } = input;
                //only logged in  users
                let viewer = await utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error("viewer can not  be found.");
                }
                const wallet = await api_1.Stripe.connect(code);
                if (!wallet) {
                    throw new Error("Stripe grant error.");
                }
                const updatedUser = await db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId: wallet.stripe_user_id } }, { returnOriginal: false });
                if (!updatedUser.value) {
                    throw new Error("Viewer could not be updated.");
                }
                viewer = updatedUser.value;
                return {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walletId: viewer.walletId,
                    didRequest: true
                };
            }
            catch (e) {
                throw new Error(e);
            }
        },
        disconnectStripe: async (_root, _args, { db, req }) => {
            try {
                let viewer = await utils_1.authorize(db, req);
                if (!viewer) {
                    throw new Error("viewer can not  be found.");
                }
                const updatedUser = await db.users.findOneAndUpdate({ _id: viewer._id }, 
                //remove stripe id
                { $set: { walletId: undefined } }, { returnOriginal: false });
                if (!updatedUser.value) {
                    throw new Error("Viewer could not be updated.");
                }
                viewer = updatedUser.value;
                return {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walletId: viewer.walletId,
                    didRequest: true
                };
            }
            catch (e) {
                throw new Error(e);
            }
        }
    },
    Viewer: {
        id: (viewer) => {
            return viewer._id;
        },
        hasWallet: (viewer) => {
            return viewer.walletId ? true : undefined;
        }
    }
};
