const { Readable } = require("stream");

const {
  cloudinary,
  configureCloudinary,
  isCloudinaryConfigured,
} = require("../config/cloudinary");

const asyncHandler = require("../utils/asyncHandler");

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

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  res.status(200).json({
    success: true,
    message: "Image deleted successfully.",
  });
});

module.exports = {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
};