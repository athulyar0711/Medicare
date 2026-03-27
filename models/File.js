const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    patient_id: {
        type: Number, // Reference to MySQL patients table user_id or patient_id
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    data: {
        type: String, // Storing base64 string
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('File', fileSchema);
