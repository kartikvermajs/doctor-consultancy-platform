const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

/* =========================================================
   ALLOWED FILE TYPES
   ========================================================= */

const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const PDF_MIME_TYPES = ["application/pdf"];

const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES];

/* =========================================================
   CLOUDINARY STORAGE CONFIG
   ========================================================= */

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isPdf = PDF_MIME_TYPES.includes(file.mimetype);

    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    return {
      folder: "appointments/documents",
      resource_type: isPdf ? "raw" : "image",
      public_id: `${Date.now()}-${safeName}`,
      overwrite: false,
    };
  },
});

/* =========================================================
   MULTER FILE FILTER
   ========================================================= */

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only JPG, JPEG, PNG, WEBP images and PDF files are allowed",
      ),
      false,
    );
  }

  cb(null, true);
};

/* =========================================================
   MULTER INSTANCE
   ========================================================= */

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

module.exports = upload;
