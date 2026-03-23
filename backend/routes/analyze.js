const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const History = require('../models/History');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const OrchestratorAgent = require('../agents/OrchestratorAgent');
const AITextDetector = require('../utils/AITextDetector');
const ResilientAPIClient = require('../utils/ResilientAPIClient');
const { uploadMedia } = require('../utils/cloudinaryUpload');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

const isValidHttpUrl = (value) => {
    try {
        const parsed = new URL(String(value || '').trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;

        const host = parsed.hostname.toLowerCase();
        const isLocalhost = host === 'localhost';
        const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
        const hasPublicLikeDomain = host.includes('.');

        return isLocalhost || isIPv4 || hasPublicLikeDomain;
    } catch {
        return false;
    }
};

const normalizeMediaVerdict = (verdict, aiProbability) => {
    const normalized = String(verdict || '').trim().toLowerCase();
    const probability = Number.isFinite(aiProbability)
        ? aiProbability
        : Number(aiProbability);
    const pct = probability > 1 ? probability : probability * 100;

    if (normalized === 'real') return 'Real';
    if (normalized === 'likely real') return 'Likely Real';
    if (normalized === 'likely ai') return 'Likely AI';
    if (normalized === 'ai generated') return 'AI Generated';
    if (normalized === 'uncertain') return pct >= 50 ? 'Likely AI' : 'Likely Real';

    return pct >= 50 ? 'Likely AI' : 'Likely Real';
};

router.post('/submit', auth, async (req, res) => {
    try {
        const { text, type, content, filename } = req.body;
        const inputText = content || text || '';
        const inputType = type || 'text';

        // Set up Server-Sent Events for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const sendUpdate = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const apiClient = new ResilientAPIClient();
        const orchestrator = new OrchestratorAgent(GEMINI_API_KEY, SERPER_API_KEY);
        const aiDetector = new AITextDetector(GEMINI_API_KEY);

        let parsedResult = null;
        let aiDetection = null;
        let aiTextDetection = null;

        if (inputType === 'url') {
            if (!isValidHttpUrl(inputText)) {
                sendUpdate({
                    stage: 'error',
                    message: 'Please enter a valid URL (example: https://example.com/article).',
                    error: 'INVALID_URL'
                });
                res.end();
                return;
            }

            sendUpdate({ stage: 'fetching', progress: 10, message: 'Fetching URL content...' });

            let response;
            try {
                response = await apiClient.callWithRetry(() =>
                    axios.get(inputText, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        maxContentLength: 5000000
                    })
                );
            } catch (fetchError) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Could not fetch the URL. The page may not exist or is blocked.",
                    error: "URL_FETCH_FAILED"
                });
                res.end();
                return;
            }

            const rawHtml = String(response.data || '');
            const withBreaks = rawHtml
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<\/li>/gi, '\n')
                .replace(/<\/h\d>/gi, '\n');

            const stripped = withBreaks
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+\n/g, '\n')
                .replace(/\n\s+/g, '\n')
                .trim();

            const filteredLines = stripped
                .split(/\n+/)
                .map((line) => line.trim())
                .filter((line) => line.length > 80);

            const filteredText = filteredLines.join(' ').replace(/\s+/g, ' ').trim().slice(0, 5000);

            if (filteredText.length < 100) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Could not extract enough content from this URL.",
                    error: "INSUFFICIENT_CONTENT"
                });
                res.end();
                return;
            }

            // AI text detection for URL content (optional, skip if rate limited)
            try {
              sendUpdate({ stage: 'detecting', progress: 20, message: 'Detecting AI-generated content...' });
              aiTextDetection = await aiDetector.detect(filteredText.substring(0, 1000)); // Limit to 1000 chars
            } catch (detectionError) {
              console.log('AI detection skipped:', detectionError.message);
              aiTextDetection = null; // Skip if fails
            }

            // Analyze with orchestrator
            parsedResult = await orchestrator.analyze(filteredText, sendUpdate);

        } else if (inputType === 'image') {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { temperature: 0 }
            });

            const dataUrlMatch = String(inputText).match(/^data:(.*?);base64,(.*)$/);
            const mimeType = dataUrlMatch?.[1] || 'image/png';
            const rawImageData = dataUrlMatch?.[2] || String(inputText);

            if (rawImageData.length > 4000000) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Image too large. Please upload an image under 3MB.",
                    error: "IMAGE_TOO_LARGE"
                });
                res.end();
                return;
            }

            // Upload to Cloudinary
            sendUpdate({ stage: 'uploading', progress: 10, message: 'Uploading image...' });
            let cloudinaryResult = null;
            try {
                cloudinaryResult = await uploadMedia(inputText, 'image', filename);
            } catch (uploadErr) {
                console.error('Cloudinary upload failed:', uploadErr);
                // Continue without Cloudinary if upload fails
            }

            sendUpdate({ stage: 'analyzing', progress: 30, message: 'Analyzing image for AI generation...' });

            const combinedPrompt = `Analyze this image for AI generation detection.

Return ONLY this JSON:
{
  "score": 100,
  "totalClaims": 0,
  "stats": { "true": 0, "false": 0, "partial": 0 },
  "text": "Image analyzed for AI detection.",
  "claims": [],
  "aiDetection": {
    "ai_probability": 0-100,
        "verdict": "Real|Likely Real|Likely AI|AI Generated",
    "indicators": ["reason1", "reason2", "reason3"]
  }
}

Consider:
1. Unnatural patterns or artifacts
2. Inconsistent lighting or shadows
3. Anatomical impossibilities
4. Texture uniformity
5. Background inconsistencies

verdict must be exactly: Real, Likely Real, Likely AI, or AI Generated
ai_probability is 0-100 where 100 means definitely AI generated`;

            try {
                const aiResult = await model.generateContent([
                    { text: combinedPrompt },
                    { inlineData: { data: rawImageData, mimeType } }
                ]);
                let aiText = aiResult.response.text().trim();
                const aiMatch = aiText.match(/```json\n([\s\S]*?)\n```/);
                if (aiMatch) aiText = aiMatch[1];
                aiText = aiText.replace(/^```|```$/g, '').trim();
                parsedResult = JSON.parse(aiText);
                aiDetection = parsedResult.aiDetection || null;
                if (aiDetection) {
                    aiDetection.verdict = normalizeMediaVerdict(aiDetection.verdict, aiDetection.ai_probability);
                }
            } catch (aiErr) {
                console.error('Image analysis failed:', aiErr.message);
                parsedResult = {
                    score: 100,
                    totalClaims: 0,
                    stats: { true: 0, false: 0, partial: 0 },
                    text: "Image uploaded for AI detection analysis.",
                    claims: []
                };
                aiDetection = {
                    ai_probability: 50,
                    verdict: "Likely AI",
                    indicators: ["Detection unavailable - please try again"]
                };
            }

            // Store Cloudinary URL
            if (cloudinaryResult) {
                parsedResult.mediaUrl = cloudinaryResult.url;
                parsedResult.cloudinaryPublicId = cloudinaryResult.publicId;
            }

            sendUpdate({ stage: 'complete', progress: 100, message: 'Image analysis complete!' });
        
        } else if (inputType === 'video') {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { temperature: 0 }
            });

            const dataUrlMatch = String(inputText).match(/^data:(.*?);base64,(.*)$/);
            const mimeType = dataUrlMatch?.[1] || 'video/mp4';
            const rawVideoData = dataUrlMatch?.[2] || String(inputText);

            if (rawVideoData.length > 50000000) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Video too large. Please upload a video under 50MB.",
                    error: "VIDEO_TOO_LARGE"
                });
                res.end();
                return;
            }

            // Upload to Cloudinary
            sendUpdate({ stage: 'uploading', progress: 10, message: 'Uploading video...' });
            let cloudinaryResult = null;
            try {
                cloudinaryResult = await uploadMedia(inputText, 'video', filename);
            } catch (uploadErr) {
                console.error('Cloudinary upload failed:', uploadErr);
                // Continue without Cloudinary if upload fails
            }

            sendUpdate({ stage: 'analyzing', progress: 30, message: 'Analyzing video for deepfake detection...' });

            const videoPrompt = `Analyze this video for deepfake detection and manipulation.

Return ONLY this JSON:
{
  "score": 100,
  "totalClaims": 0,
  "stats": { "true": 0, "false": 0, "partial": 0 },
  "text": "Video analyzed for deepfake detection.",
  "claims": [],
  "aiDetection": {
    "ai_probability": 0-100,
        "verdict": "Real|Likely Real|Likely AI|AI Generated",
    "indicators": ["reason1", "reason2", "reason3", "reason4", "reason5"]
  }
}

Analyze for:
1. Facial inconsistencies (blinking patterns, lip sync issues)
2. Unnatural movements or jerky transitions
3. Lighting and shadow inconsistencies across frames
4. Audio-visual synchronization issues
5. Background artifacts or glitches
6. Skin texture and facial feature anomalies
7. Edge artifacts around face or body
8. Temporal consistency issues between frames

verdict must be exactly: Real, Likely Real, Likely AI, or AI Generated
ai_probability is 0-100 where 100 means definitely AI generated/deepfake`;

            try {
                sendUpdate({ stage: 'processing', progress: 50, message: 'Processing video frames...' });
                
                const videoResult = await model.generateContent([
                    { text: videoPrompt },
                    { inlineData: { data: rawVideoData, mimeType } }
                ]);
                
                let videoText = videoResult.response.text().trim();
                const videoMatch = videoText.match(/```json\n([\s\S]*?)\n```/);
                if (videoMatch) videoText = videoMatch[1];
                videoText = videoText.replace(/^```|```$/g, '').trim();
                
                parsedResult = JSON.parse(videoText);
                aiDetection = parsedResult.aiDetection || null;
                if (aiDetection) {
                    aiDetection.verdict = normalizeMediaVerdict(aiDetection.verdict, aiDetection.ai_probability);
                }
                
                sendUpdate({ stage: 'verifying', progress: 80, message: 'Finalizing deepfake analysis...' });
            } catch (videoErr) {
                console.error('Video analysis failed:', videoErr.message);
                parsedResult = {
                    score: 50,
                    totalClaims: 0,
                    stats: { true: 0, false: 0, partial: 0 },
                    text: "Video uploaded for deepfake detection analysis.",
                    claims: []
                };
                aiDetection = {
                    ai_probability: 50,
                    verdict: "Likely AI",
                    indicators: ["Analysis unavailable - video may be too long or format unsupported", "Try a shorter video clip (under 30 seconds)", "Supported formats: MP4, MOV, WEBM"]
                };
            }

            // Store Cloudinary URL and thumbnail
            if (cloudinaryResult) {
                parsedResult.mediaUrl = cloudinaryResult.url;
                parsedResult.thumbnailUrl = cloudinaryResult.thumbnailUrl;
                parsedResult.cloudinaryPublicId = cloudinaryResult.publicId;
            }

            sendUpdate({ stage: 'complete', progress: 100, message: 'Video analysis complete!' });

        } else if (inputType === 'file') {
            sendUpdate({ stage: 'processing', progress: 20, message: 'Processing document...' });

            const safeName = typeof filename === 'string' ? filename : '';
            const ext = safeName.toLowerCase();
            const dataUrlMatch = String(inputText).match(/^data:(.*?);base64,(.*)$/);
            const base64Content = dataUrlMatch?.[2] || '';
            let fileText = '';

            if (ext.endsWith('.txt') || ext.endsWith('.csv')) {
                fileText = inputText;
            } else if (ext.endsWith('.pdf') && base64Content) {
                const buffer = Buffer.from(base64Content, 'base64');
                const parser = new PDFParse({ data: buffer });
                const pdfData = await parser.getText();
                fileText = pdfData.text || '';
                await parser.destroy();
            } else if (ext.endsWith('.docx') && base64Content) {
                const buffer = Buffer.from(base64Content, 'base64');
                const docData = await mammoth.extractRawText({ buffer });
                fileText = docData.value || '';
            }

            if (!fileText) {
                fileText = safeName
                    ? `File: ${safeName} was uploaded, analyze the filename for any factual claims.`
                    : '';
            }

            if (fileText.length < 50) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Could not extract enough content from this file.",
                    error: "INSUFFICIENT_CONTENT"
                });
                res.end();
                return;
            }

            // AI text detection for documents (optional)
            try {
              sendUpdate({ stage: 'detecting', progress: 30, message: 'Detecting AI-generated content...' });
              aiTextDetection = await aiDetector.detect(fileText.substring(0, 1000)); // Limit to 1000 chars
            } catch (detectionError) {
              console.log('AI detection skipped:', detectionError.message);
              aiTextDetection = null;
            }

            // Analyze with orchestrator
            parsedResult = await orchestrator.analyze(fileText, sendUpdate);

        } else {
            // Plain text analysis
            if (!String(inputText || '').trim()) {
                sendUpdate({ 
                    stage: 'error', 
                    message: "Please provide text to analyze.",
                    error: "TEXT_EMPTY"
                });
                res.end();
                return;
            }

            // AI text detection (optional)
            try {
              sendUpdate({ stage: 'detecting', progress: 10, message: 'Detecting AI-generated content...' });
              aiTextDetection = await aiDetector.detect(inputText.substring(0, 1000)); // Limit to 1000 chars
            } catch (detectionError) {
              console.log('AI detection skipped:', detectionError.message);
              aiTextDetection = null;
            }

            // Analyze with orchestrator
            parsedResult = await orchestrator.analyze(inputText, sendUpdate);
        }


        // Add AI text detection to result if available
        if (aiTextDetection) {
            parsedResult.aiTextDetection = aiTextDetection;
        }

        if (aiDetection) {
            parsedResult.aiDetection = aiDetection;
        }

        const previewSource = inputType === 'image'
            ? (filename || 'Image upload')
            : inputType === 'video'
                ? (filename || 'Video upload')
                : inputType === 'file'
                    ? (filename || 'File upload')
                    : inputText;

        // For images and videos, use AI probability as score
        const finalScore = (inputType === 'image' || inputType === 'video') && parsedResult.aiDetection
            ? (parsedResult.aiDetection.ai_probability > 1 
                ? Math.round(parsedResult.aiDetection.ai_probability)
                : Math.round(parsedResult.aiDetection.ai_probability * 100))
            : parsedResult.score;

        const historyObj = new History({
            userId: req.user.id,
            type: inputType,
            preview: previewSource.substring(0, 150) + (previewSource.length > 150 ? '...' : ''),
            score: finalScore,
            totalClaims: parsedResult.totalClaims,
            stats: parsedResult.stats,
            claims: parsedResult.claims,
            aiDetection: parsedResult.aiDetection || null,
            aiTextDetection: parsedResult.aiTextDetection || null,
            originalText: inputType === 'image' || inputType === 'video' ? previewSource : inputText,
            mediaUrl: parsedResult.mediaUrl || null,
            thumbnailUrl: parsedResult.thumbnailUrl || null,
            fileName: filename || null
        });

        await historyObj.save();

        // Send final result
        sendUpdate({ 
            stage: 'saved', 
            progress: 100, 
            message: 'Analysis saved to history!',
            result: parsedResult
        });

        res.end();

    } catch (err) {
        console.error('Analysis error:', err);
        
        try {
            res.write(`data: ${JSON.stringify({ 
                stage: 'error', 
                message: err.message || "Analysis failed. Please try again.",
                error: err.message
            })}\n\n`);
            res.end();
        } catch (writeErr) {
            console.error('Failed to send error:', writeErr);
        }
    }
});

router.get('/history', auth, async (req, res) => {
    try {
        const histories = await History.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(histories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Fetch history failed" });
    }
});

router.get('/history/:id', auth, async (req, res) => {
    try {
        const history = await History.findOne({ _id: req.params.id, userId: req.user.id });
        if (!history) {
            return res.status(404).json({ message: "History not found" });
        }
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Fetch history item failed" });
    }
});

router.delete('/history/:id', auth, async (req, res) => {
    try {
        const history = await History.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!history) {
            return res.status(404).json({ message: "History not found" });
        }
        res.json({ message: "History deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Delete history failed" });
    }
});

module.exports = router;