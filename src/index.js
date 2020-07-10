"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
//database
const index_1 = require("./database/index");
//apollo server
const apollo_server_express_1 = require("apollo-server-express");
const graphql_1 = require("./graphql");
const compression_1 = __importDefault(require("compression"));
const mount = async (app) => {
    const db = await index_1.connectDB();
    app.use(compression_1.default());
    app.use(body_parser_1.default.json({ limit: "2mb" }));
    app.use(express_1.default.static(`${__dirname}/client`));
    app.get("/*", (_req, res) => res.sendFile(`${__dirname}/client/index.html`));
    //apollo setup
    const server = new apollo_server_express_1.ApolloServer({
        typeDefs: graphql_1.typeDefs,
        resolvers: graphql_1.resolvers,
        context: ({ req, res }) => ({ db, req, res })
    });
    server.applyMiddleware({ app, path: "/api" });
    app.listen(process.env.PORT || 8080);
};
mount(express_1.default());
