"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const client = new stripe_1.default(`${process.env.S_SECRET_KEY}`, {
    apiVersion: "2020-03-02"
});
exports.Stripe = {
    connect: async (code) => {
        const res = await client.oauth.token({
            grant_type: "authorization_code",
            code
        });
        return res;
    },
    charge: async (amount, source, stripeAccount) => {
        const res = await client.charges.create({
            amount,
            currency: "usd",
            source,
            application_fee_amount: Math.round(amount * 0.05)
        }, { stripeAccount: stripeAccount });
        if (res.status !== "succeeded") {
            throw new Error("Failed to charge with Stripe.");
        }
    }
};
