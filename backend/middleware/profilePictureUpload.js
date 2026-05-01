const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    return {
      folder: "Profile_Pictures",
      resource_type: "image",
      public_id: `${Date.now()}-${safeName}`,
      overwrite: false,
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only JPG, JPEG, PNG, WEBP images are allowed"
      ),
      false
    );
  }

  cb(null, true);
};

const profilePictureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
});

module.exports = profilePictureUpload;
