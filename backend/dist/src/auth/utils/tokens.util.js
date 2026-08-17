"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDuration = parseDuration;
exports.generateRandomToken = generateRandomToken;
exports.hashToken = hashToken;
exports.generateTempPassword = generateTempPassword;
const crypto_1 = require("crypto");
const DURATION_UNITS_MS = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
};
function parseDuration(value) {
    const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
    if (!match) {
        throw new Error(`Invalid duration string: "${value}"`);
    }
    return Number(match[1]) * DURATION_UNITS_MS[match[2]];
}
function generateRandomToken(bytes = 64) {
    return (0, crypto_1.randomBytes)(bytes).toString('hex');
}
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
function generateTempPassword(length = 12) {
    const bytes = (0, crypto_1.randomBytes)(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += TEMP_PASSWORD_CHARSET[bytes[i] % TEMP_PASSWORD_CHARSET.length];
    }
    return password;
}
//# sourceMappingURL=tokens.util.js.map