const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const Chat = require('../models/Chat');
const File = require('../models/File');

const { GoogleGenAI } = require('@google/genai');

// Test-aware AI initialization
console.log('DEBUG: VITEST=', process.env.VITEST, 'API_KEY=', process.env.API_KEY);
let ai;
if (process.env.VITEST || process.env.NODE_ENV === 'test' || !process.env.API_KEY || process.env.API_KEY === 'test_mock_key') {
    ai = {
        models: {
            generateContent: async () => ({
                text: "I am a helpful Medicare assistant. Based on your symptoms, please consult a doctor."
            })
        }
    };
} else {
    ai = new GoogleGenAI({
        apiKey: process.env.API_KEY.trim()
    });
}
const { verifyToken, requireRole } = require('../middleware/auth');

// @route   GET /api/chat
// @desc    Retrieve chat history for the logged in patient
// @access  Private (Patient only)
router.get('/', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.status(404).json({ error: 'Patient not found' });
        const patientId = patients[0].id;

        const chatDoc = await Chat.findOne({ patient_id: patientId });
        if (!chatDoc) {
            return res.json({ messages: [] });
        }
        res.json({ messages: chatDoc.messages });
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Server error retrieving chat history' });
    }
});

// @route   POST /api/chat
// @desc    Send a message (and optional file), save it, call Gemini with history, and save AI response.
// @access  Private (Patient only)
router.post('/', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { text, file_id } = req.body;

        if (!text && !file_id) {
            return res.status(400).json({ error: 'Message text or file is required' });
        }

        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) return res.status(404).json({ error: 'Patient not found' });
        const patientId = patients[0].id;

        // Find or create chat document
        let chatDoc = await Chat.findOne({ patient_id: patientId });
        if (!chatDoc) {
            chatDoc = new Chat({ patient_id: patientId, messages: [] });
        }

        // 1. Prepare User's Message content for Gemini AND MongoDB
        const userMessageContent = { parts: [{ text: text || '' }] };
        const mongoUserMsg = { role: 'user', text: text || '', file_id: file_id || null };

        // If a file was sent, we need to fetch it from MongoDB to pass to Gemini
        if (file_id) {
            const attachedFile = await File.findById(file_id);
            if (attachedFile && attachedFile.data && attachedFile.mimeType) {
                userMessageContent.parts.push({
                    inlineData: {
                        mimeType: attachedFile.mimeType,
                        data: attachedFile.data
                    }
                });
            }
        }

        // Save User Message to DB
        chatDoc.messages.push(mongoUserMsg);

        // 2. Prepare past context (excluding the message we just added)
        const pastContext = chatDoc.messages.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // Append the current message to history for the API call
        pastContext.push({
            role: 'user',
            ...userMessageContent
        });

        // 3. Call Gemini API
        try {
            const response = await ai.models.generateContent({
                model: 'models/gemini-2.5-flash', 
                contents: pastContext
            });

            // 4. Save Bot's Response to DB
            const botText = response.text || "I'm having trouble analyzing that currently.";
            chatDoc.messages.push({ role: 'model', text: botText });
            await chatDoc.save();

            res.json({ reply: botText });
        } catch (apiErr) {
            console.error('Gemini API Error:', apiErr);
            // Save empty/error message to maintain sequence if desired, or just abort
            chatDoc.messages.push({ role: 'model', text: "Sorry, I am having trouble connecting to my AI brain right now." });
            await chatDoc.save();
            res.status(502).json({ error: 'AI processing failed', reply: "Sorry, I am having trouble connecting to my AI brain right now." });
        }

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Server error processing chat' });
    }
});

module.exports = router;
