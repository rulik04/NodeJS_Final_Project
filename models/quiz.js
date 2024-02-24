const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const quizSchema = new Schema({
    userID: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionsData: { type: JSON, required: true },
    selectedAnswers: { type: JSON, required: true },
    submitAt: { type: Date, default: Date.now, required: true },
    category: { type: String, required: true },
    totalCorrect: { type: Number, default: 0, required: true },
    totalWrong: { type: Number, default: 0, required: true },
    totalTime: { type: Number, default: 0, required: true },
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;