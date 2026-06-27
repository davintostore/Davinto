const { Readable } = require("stream");

const {
  cloudinary,
  configureCloudinary,
  isCloudinaryConfigured,
} = require("../config/cloudinary");
const {
  deleteCloudinaryImageIfUnreferenced,
} = require("../services/cloudinaryCleanup.service");

const asyncHandler = require("../utils/asyncHandler");

const allowedImageTypes = {
  jpeg: {
    mimeTypes: new Set(["image/jpeg"]),
    extensions: new Set([".jpg", ".jpeg"]),
  },
  png: {
    mimeTypes: new Set(["image/png"]),
    extensions: new Set([".png"]),
  },
  webp: {
    mimeTypes: new Set(["image/webp"]),
    extensions: new Set([".webp"]),
  },
};

const sanitizeFolder = (value = "") => {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
};

const getUploadFolder = (requestedFolder = "") => {
  const rootFolder = sanitizeFolder(
    process.env.CLOUDINARY_UPLOAD_FOLDER || "davinto"
  );

  const childFolder = sanitizeFolder(requestedFolder);

  if (!childFolder) {
    return rootFolder;
  }

  return `${rootFolder}/${childFolder}`;
};

const getFileExtension = (filename = "") => {
  const normalizedName = String(filename || "").trim().toLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");

  return dotIndex >= 0 ? normalizedName.slice(dotIndex) : "";
};

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return "";
  }

  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return "";
};

const validateUploadedImageFile = (file) => {
  const detectedType = detectImageType(file.buffer);
  const imageType = allowedImageTypes[detectedType];
  const extension = getFileExtension(file.originalname);

  if (!imageType) {
    const error = new Error("Unsupported or invalid image file.");
    error.statusCode = 400;
    throw error;
  }

  if (
    !imageType.mimeTypes.has(file.mimetype) ||
    !imageType.extensions.has(extension)
  ) {
    const error = new Error(
      "Image file type does not match its extension or MIME type."
    );
    error.statusCode = 400;
    throw error;
  }
};

const uploadBufferToCloudinary = ({ buffer, folder }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const uploadImageToCloudinary = asyncHandler(async (req, res) => {
  configureCloudinary();

  if (!isCloudinaryConfigured()) {
    res.status(500);
    throw new Error(
      "Cloudinary is not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to server/.env."
    );
  }

  if (!req.file) {
    res.status(400);
    throw new Error("Image file is required.");
  }

  validateUploadedImageFile(req.file);

  const folder = getUploadFolder(req.body.folder || "products");

  const result = await uploadBufferToCloudinary({
    buffer: req.file.buffer,
    folder,
  });

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully.",
    image: {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      folder,
    },
  });
});

const deleteImageFromCloudinary = asyncHandler(async (req, res) => {
  configureCloudinary();

  if (!isCloudinaryConfigured()) {
    res.status(500);
    throw new Error(
      "Cloudinary is not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to server/.env."
    );
  }

  const publicId = String(req.body.publicId || "").trim();

  if (!publicId) {
    res.status(400);
    throw new Error("Cloudinary publicId is required.");
  }

  const cleanupResult = await deleteCloudinaryImageIfUnreferenced(publicId);

  res.status(200).json({
    success: true,
    message: cleanupResult.deleted
      ? "Image deleted successfully."
      : "Image cleanup skipped because the asset is still referenced or unavailable.",
  });
});

module.exports = {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
};
