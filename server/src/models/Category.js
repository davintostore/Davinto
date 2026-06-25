const mongoose = require("mongoose");
const generateSlug = require("../utils/generateSlug");

const categoryImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: "",
    },

    publicId: {
      type: String,
      trim: true,
      default: "",
    },

    alt: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const categoryArabicTranslationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [80, "Arabic category name cannot exceed 80 characters."],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        500,
        "Arabic category description cannot exceed 500 characters.",
      ],
      default: "",
    },
    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: [120, "Arabic SEO title cannot exceed 120 characters."],
        default: "",
      },
      description: {
        type: String,
        trim: true,
        maxlength: [
          220,
          "Arabic SEO description cannot exceed 220 characters.",
        ],
        default: "",
      },
    },
  },
  {
    _id: false,
  }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required."],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters."],
      maxlength: [80, "Category name cannot exceed 80 characters."],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Category description cannot exceed 500 characters."],
      default: "",
    },

    image: {
      type: categoryImageSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: [120, "SEO title cannot exceed 120 characters."],
        default: "",
      },

      description: {
        type: String,
        trim: true,
        maxlength: [220, "SEO description cannot exceed 220 characters."],
        default: "",
      },
    },

    translations: {
      ar: {
        type: categoryArabicTranslationSchema,
        default: () => ({}),
      },
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }

  if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

});

module.exports = mongoose.model("Category", categorySchema);
