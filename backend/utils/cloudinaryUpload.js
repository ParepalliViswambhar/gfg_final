const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image or video to Cloudinary
 * @param {string} base64Data - Base64 encoded data with data URI prefix
 * @param {string} type - 'image' or 'video'
 * @param {string} fileName - Original filename (optional)
 * @returns {Promise<Object>} - Upload result with URL and thumbnail
 */
async function uploadMedia(base64Data, type = 'image', fileName = null) {
  try {
    const resourceType = type === 'video' ? 'video' : 'image';
    
    const uploadOptions = {
      resource_type: resourceType,
      folder: `verifai/${type}s`,
      transformation: type === 'image' ? [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
      ] : undefined
    };

    // Add public_id if filename provided
    if (fileName) {
      const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      uploadOptions.public_id = `${cleanName}_${Date.now()}`;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Data, uploadOptions);

    const response = {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type
    };

    // For videos, generate thumbnail
    if (type === 'video') {
      response.thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 400, height: 300, crop: 'fill' },
          { start_offset: '1' } // Get frame at 1 second
        ]
      });
    }

    return response;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload ${type}: ${error.message}`);
  }
}

/**
 * Delete media from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image' or 'video'
 */
async function deleteMedia(publicId, resourceType = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw error, just log it
  }
}

module.exports = {
  uploadMedia,
  deleteMedia
};
