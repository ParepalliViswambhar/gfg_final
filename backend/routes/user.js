const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const History = require('../models/History');

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const historyCount = await History.countDocuments({ userId: req.user.id });
        const recentHistory = await History.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5);

        const totalClaims = await History.aggregate([
            { $match: { userId: user._id } },
            { $group: { _id: null, total: { $sum: '$totalClaims' } } }
        ]);

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            },
            stats: {
                totalAnalyses: historyCount,
                totalClaims: totalClaims[0]?.total || 0,
                recentAnalyses: recentHistory.length
            },
            recentHistory: recentHistory
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
});

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('preferences');
        res.json(user.preferences || {});
    } catch (error) {
        console.error('Preferences error:', error);
        res.status(500).json({ message: 'Failed to fetch preferences' });
    }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.preferences = { ...user.preferences, ...req.body };
        await user.save();
        res.json({ message: 'Preferences updated successfully', preferences: user.preferences });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Failed to update preferences' });
    }
});

module.exports = router;
