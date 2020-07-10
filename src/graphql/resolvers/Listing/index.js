"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingResolvers = void 0;
const types_1 = require("../../../models/types");
const types_2 = require("./types");
const api_1 = require("../../../lib/api");
const mongodb_1 = require("mongodb");
const utils_1 = require("../../../lib/utils");
const verifyHostInput = ({ title, description, type, price }) => {
    if (title.length > 100) {
        throw new Error("Title must be under 100 characters.");
    }
    if (description.length > 500) {
        throw new Error("Description must be under 500 characters.");
    }
    if (price < 0) {
        throw new Error("Price must be higher then 0.");
    }
    if (type !== types_1.ListingType.Apartment && type !== types_1.ListingType.House) {
        throw new Error("Type must be either Apartment or House.");
    }
};
exports.listingResolvers = {
    Query: {
        listing: async (_root, { id }, { db, req }) => {
            try {
                const listing = await db.listings.findOne({ _id: new mongodb_1.ObjectID(id) });
                if (!listing) {
                    throw new Error("no listing found");
                }
                // authorize user
                const viewer = await utils_1.authorize(db, req);
                if (viewer && viewer._id === listing.host) {
                    listing.authorized = true;
                }
                return listing;
            }
            catch (err) {
                throw new Error(err);
            }
        },
        listings: async (_root, { location, filter, limit, page }, { db }) => {
            try {
                const data = {
                    total: 0,
                    result: []
                };
                //if there is  location info passed from client, look up and find matched listings
                const query = {};
                if (location) {
                    const { country, admin, city } = await api_1.Google.geocode(location);
                    if (!country)
                        throw new Error("No country found.");
                    if (city) {
                        query.city = city;
                        data.region = `${city}`;
                    }
                    if (admin) {
                        query.admin = admin;
                    }
                    if (country) {
                        query.country = country;
                        data.region = data.region
                            ? data.region + `, ${country}`
                            : `${country}`;
                    }
                }
                let cursor = await db.listings.find(query);
                if (!cursor) {
                    throw new Error("no listings found");
                }
                //apply price filters
                if (filter && filter === types_2.ListingsFilter.PRICE_HIGH_TO_LOW) {
                    cursor = cursor.sort({ price: -1 });
                }
                if (filter && filter === types_2.ListingsFilter.PRICE_LOW_TO_HIGH) {
                    cursor = cursor.sort({ price: 1 });
                }
                cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
                cursor = cursor.limit(limit);
                (data.total = await cursor.count()),
                    (data.result = await cursor.toArray());
                return data;
            }
            catch (error) {
                throw new Error(error);
            }
        }
    },
    Mutation: {
        hostListing: async (_root, { input }, { db, req }) => {
            //validate input
            verifyHostInput(input);
            // find user via csrf token
            const viewer = await utils_1.authorize(db, req);
            if (!viewer) {
                throw new Error("Viewer can not be found.");
            }
            //geo code input address
            const parts = input.address.split(",");
            const city = parts[1].trim();
            const admin = parts[2].trim();
            const { country } = await api_1.Google.geocode(input.address);
            if (!country) {
                throw new Error("Invalid address.");
            }
            //pass base64 image to cloudinary and store url in the database
            const imageUrl = await api_1.Cloudinary.upload(input.image);
            // if no errors insert new listing in database
            const newListing = await db.listings.insertOne({
                _id: new mongodb_1.ObjectID(),
                ...input,
                image: imageUrl,
                bookings: [],
                bookingIndex: {},
                city,
                country,
                admin,
                host: viewer._id
            });
            //update user with new listing he created
            const insertedListing = newListing.ops[0];
            await db.users.updateOne({ _id: viewer._id }, { $push: { listings: insertedListing._id } });
            return insertedListing;
        }
    },
    Listing: {
        bookings: async (listing, { limit, page }, { db }) => {
            try {
                if (!listing.authorized) {
                    return undefined;
                }
                const data = {
                    total: 0,
                    result: []
                };
                //pagination
                let cursor = await db.bookings.find({ _id: { $in: listing.bookings } });
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
        id: (listing) => {
            return listing._id.toString();
        },
        host: async (listing, _args, { db }) => {
            const host = await db.users.findOne({ _id: listing.host });
            if (!host) {
                throw new Error("host can`t be found");
            }
            return host;
        },
        bookingIndex: (listing) => {
            return JSON.stringify(listing.bookingIndex);
        }
    }
};
