"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const app_1 = __importDefault(require("../src/app"));
const db_1 = require("../src/db");
let dbPromise = null;
async function ensureDb() {
    if (!dbPromise) {
        dbPromise = (0, db_1.connectDB)();
    }
    try {
        await dbPromise;
    }
    catch (err) {
        console.error('DB connection failed in serverless function:', err);
        // Let the request still proceed; mongoose will buffer briefly
    }
}
async function handler(req, res) {
    await ensureDb();
    return (0, app_1.default)(req, res);
}
