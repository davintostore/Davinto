const multer = require("multer");

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed."), false);
    return;
  }

  cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const handleMulterError = (err, req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400);
      next(new Error("Image is too large. Maximum size is 5MB."));
      return;
    }

    res.status(400);
    next(new Error(err.message));
    return;
  }

  res.status(400);
  next(err);
};

module.exports = {
  uploadImage,
  handleMulterError,
};