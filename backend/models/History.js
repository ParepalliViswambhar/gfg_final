const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'url', 'image', 'video', 'file'], default: 'text' },
  preview: { type: String },
  score: { type: Number },
  totalClaims: { type: Number },
  stats: { type: Object },
  claims: { type: Array },
  originalText: { type: String },
  aiDetection: { type: Object, default: null },
  aiTextDetection: { type: Object, default: null },
  mediaUrl: { type: String, default: null }, // Cloudinary URL for images/videos
  thumbnailUrl: { type: String, default: null }, // Thumbnail for videos
  fileName: { type: String, default: null } // Original filename
}, { timestamps: true });

module.exports = mongoose.model('History', historySchema);