const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcmaky2ob',
  api_key: process.env.CLOUDINARY_API_KEY || '821274123658962',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'MS203YKQ03Tb0bJ5k8-NUtp1JdY'
});

const uploadMedia = async (base64Str) => {
  if (!base64Str) return null;
  // If it's already a URL, return it
  if (base64Str.startsWith('http')) return base64Str;
  
  try {
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'smartfixapp';
    const uploadResponse = await cloudinary.uploader.upload(base64Str, {
      resource_type: "auto",
      upload_preset: uploadPreset
    });
    return uploadResponse.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    // Fallback to original string if upload fails (e.g. invalid base64)
    return base64Str;
  }
};

module.exports = { uploadMedia, cloudinary };
