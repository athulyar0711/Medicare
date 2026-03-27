const express = require('express');
const router = express.Router();
const File = require('../models/File');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
let ai;
if (process.env.VITEST || process.env.NODE_ENV === 'test' || !process.env.API_KEY || process.env.API_KEY === 'test_mock_key') {
    ai = {
        models: {
            generateContent: async () => ({
                text: JSON.stringify({ blood_sugar: 95, vitamin_d: 32, summary: "Metrics look normal." })
            })
        }
    };
} else {
    const { GoogleGenAI } = require('@google/genai');
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY.trim() });
}

// @route   POST /api/files/upload
// @desc    Upload a file (base64 format expected from chatbot) and extract health metrics
// @access  Private (Patient only)
router.post('/upload', verifyToken, requireRole('patient'), async (req, res) => {
    try {
        const { filename, mimeType, data } = req.body;

        if (!data || !mimeType) {
            return res.status(400).json({ error: 'File data and mimeType are required' });
        }

        // 1. Find patient ID
        const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patients.length === 0) {
            return res.status(404).json({ error: 'Patient profile not found.' });
        }
        const patientId = patients[0].id;

        const newFile = new File({
            patient_id: patientId,
            filename: filename || `file_${Date.now()}`,
            mimeType,
            data
        });

        const savedFile = await newFile.save();

        // 2. Extract health metrics via Gemini asynchronously (don't block response)
        (async () => {
            try {
                const prompt = `Analyze this medical document and extract the 'blood sugar' (in mg/dL) and 'vitamin D' (in ng/mL) levels if present.
Return ONLY a valid JSON object with the keys "blood_sugar" and "vitamin_d".
Use null for the value if the metric is not found. Example: {"blood_sugar": 95.5, "vitamin_d": 32.1}`;

                const response = await ai.models.generateContent({
                    model: 'models/gemini-2.5-flash',
                    contents: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: data
                            }
                        }
                    ]
                });

                let text = response.text;
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const metrics = JSON.parse(text);

                if (metrics.blood_sugar != null || metrics.vitamin_d != null) {
                     const [existing] = await pool.query('SELECT id FROM health_metrics WHERE patient_id = ?', [patientId]);
                     
                     if (existing.length > 0) {
                          const updates = [];
                          const params = [];
                          if (metrics.blood_sugar != null) {
                              updates.push('blood_sugar = ?');
                              params.push(metrics.blood_sugar);
                          }
                          if (metrics.vitamin_d != null) {
                              updates.push('vitamin_d = ?');
                              params.push(metrics.vitamin_d);
                          }
                          
                          if (updates.length > 0) {
                              params.push(patientId);
                              await pool.query(
                                  `UPDATE health_metrics SET ${updates.join(', ')}, recorded_at = NOW() WHERE patient_id = ?`,
                                  params
                              );
                              console.log('Automagically updated AI metrics for patient', patientId);
                          }
                     } else {
                          await pool.query(
                              'INSERT INTO health_metrics (patient_id, blood_sugar, vitamin_d) VALUES (?, ?, ?)',
                              [patientId, metrics.blood_sugar || null, metrics.vitamin_d || null]
                          );
                          console.log('Automagically inserted AI metrics for patient', patientId);
                     }
                }
            } catch (aiErr) {
                console.error('Failed to parse AI metrics in background:', aiErr);
            }
        })();

        res.status(201).json({
            message: 'File uploaded successfully to MongoDB',
            fileId: savedFile._id
        });
    } catch (err) {
        console.error('Error saving file to MongoDB:', err);
        res.status(500).json({ error: 'Server Error saving file' });
    }
});

// @route   GET /api/files/:id
// @desc    Retrieve a file by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({
            filename: file.filename,
            mimeType: file.mimeType,
            data: file.data,
            uploadedAt: file.uploadedAt
        });
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/files/patient/:patientId
// @desc    Retrieve all files for a specific patient
// @access  Doctor Only
router.get('/patient/:patientId', verifyToken, requireRole('doctor_user'), async (req, res) => {
    try {
        // Find doctor to confirm access (simplified for now: any doctor can view)
        const files = await File.find({ patient_id: req.params.patientId }).sort({ uploadedAt: -1 }).select('-data');
        res.json(files);
    } catch (err) {
        console.error('Error retrieving patient files:', err);
        res.status(500).json({ error: 'Server Error fetching patient files' });
    }
});

module.exports = router;
