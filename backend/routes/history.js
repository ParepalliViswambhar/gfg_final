const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const History = require('../models/History');

// Get all history for current user
router.get('/', auth, async (req, res) => {
    try {
        const histories = await History.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(100); // Limit to last 100 analyses
        res.json(histories);
    } catch (err) {
        console.error('Fetch history error:', err);
        res.status(500).json({ message: "Failed to fetch history" });
    }
});

// Get single history item by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const history = await History.findOne({ 
            _id: req.params.id, 
            userId: req.user.id 
        });
        
        if (!history) {
            return res.status(404).json({ message: "History item not found" });
        }
        
        res.json(history);
    } catch (err) {
        console.error('Fetch history item error:', err);
        res.status(500).json({ message: "Failed to fetch history item" });
    }
});

// Delete single history item
router.delete('/:id', auth, async (req, res) => {
    try {
        const history = await History.findOneAndDelete({ 
            _id: req.params.id, 
            userId: req.user.id 
        });
        
        if (!history) {
            return res.status(404).json({ message: "History item not found" });
        }
        
        res.json({ message: "History item deleted successfully" });
    } catch (err) {
        console.error('Delete history error:', err);
        res.status(500).json({ message: "Failed to delete history item" });
    }
});

// Delete all history for current user
router.delete('/', auth, async (req, res) => {
    try {
        const result = await History.deleteMany({ userId: req.user.id });
        res.json({ 
            message: "All history deleted successfully",
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        console.error('Delete all history error:', err);
        res.status(500).json({ message: "Failed to delete history" });
    }
});

// Get history statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const histories = await History.find({ userId: req.user.id });
        
        const stats = {
            totalAnalyses: histories.length,
            totalClaims: histories.reduce((sum, h) => sum + (h.totalClaims || 0), 0),
            averageScore: histories.length > 0 
                ? Math.round(histories.reduce((sum, h) => sum + (h.score || 0), 0) / histories.length)
                : 0,
            byType: {
                text: histories.filter(h => h.type === 'text').length,
                url: histories.filter(h => h.type === 'url').length,
                image: histories.filter(h => h.type === 'image').length,
                file: histories.filter(h => h.type === 'file').length,
                video: histories.filter(h => h.type === 'video').length
            },
            recentActivity: histories.slice(0, 5).map(h => ({
                id: h._id,
                type: h.type,
                score: h.score,
                date: h.createdAt
            }))
        };
        
        res.json(stats);
    } catch (err) {
        console.error('Fetch stats error:', err);
        res.status(500).json({ message: "Failed to fetch statistics" });
    }
});

module.exports = router;
