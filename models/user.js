const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: 'admin' },
    createdAt: { type: Date, default: Date.now, required: true},
    updatedAt: { type: Date, default: Date.now, required: true},
    totalAttempt: { type: Number, default: 0, required: true },
    totalCorrect: { type: Number, default: 0, required: true },
    totalWrong: { type: Number, default: 0, required: true },
    totalTime: { type: Number, default: 0, required: true },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
