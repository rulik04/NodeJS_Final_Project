const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    pictures: [String],
    names: {
        english: String,
        russian: String
    },
    descriptions: {
        english: String,
        russian: String 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date,
        default: null
    },
    date : {
        type: Date
    }
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
