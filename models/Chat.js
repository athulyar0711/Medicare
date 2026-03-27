const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'model'],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    file_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false }); // Prevent mongoose from creating an _id for every single message subdocument

const ChatSchema = new mongoose.Schema({
    patient_id: {
        type: Number,
        required: true,
        unique: true
    },
    messages: [MessageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);
