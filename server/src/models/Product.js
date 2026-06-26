const mongoose = require("mongoose");
const generateSlug = require("../utils/generateSlug");

const imageArabicTranslationSchema = new mongoose.Schema(
  {
    alt: {
      type: String,
      trim: true,
      maxlength: [240, "Arabic image alt text cannot exceed 240 characters."],
      default: "",
    },
  },
  {
    _id: false,
  }
);

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required."],
      trim: true,
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

    translations: {
      ar: {
        type: imageArabicTranslationSchema,
        default: () => ({}),
      },
    },

    role: {
      type: String,
      enum: ["primary", "hover", "gallery"],
      default: "gallery",
    },

    position: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: false,
  }
);

const productSizeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Size label is required."],
      trim: true,
      uppercase: true,
    },

    sku: {
      type: String,
      trim: true,
      default: "",
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative."],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
  }
);

const colorArabicTranslationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [80, "Arabic color name cannot exceed 80 characters."],
      default: "",
    },
  },
  {
    _id: false,
  }
);

const productColorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Color name is required."],
      trim: true,
    },

    translations: {
      ar: {
        type: colorArabicTranslationSchema,
        default: () => ({}),
      },
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },

    hex: {
      type: String,
      trim: true,
      default: "",
      match: [/^#([0-9A-F]{3}){1,2}$/i, "Please enter a valid HEX color."],
    },

    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator(images) {
          return Array.isArray(images);
        },
        message: "Images must be an array.",
      },
    },

    sizes: {
      type: [productSizeSchema],
      default: [],
      validate: {
        validator(sizes) {
          return Array.isArray(sizes) && sizes.length > 0;
        },
        message: "Each color must have at least one size.",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
  }
);

productColorSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }

  if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

  if (Array.isArray(this.images)) {
    this.images.sort((a, b) => (a.position || 0) - (b.position || 0));
  }

});

const productArabicTranslationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [140, "Arabic product name cannot exceed 140 characters."],
      default: "",
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [
        280,
        "Arabic short description cannot exceed 280 characters.",
      ],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        4000,
        "Arabic product description cannot exceed 4000 characters.",
      ],
      default: "",
    },
    fabric: {
      type: String,
      trim: true,
      maxlength: [120, "Arabic fabric cannot exceed 120 characters."],
      default: "",
    },
    fit: {
      type: String,
      trim: true,
      maxlength: [120, "Arabic fit cannot exceed 120 characters."],
      default: "",
    },
    care: {
      type: String,
      trim: true,
      maxlength: [800, "Arabic care cannot exceed 800 characters."],
      default: "",
    },
    badges: {
      type: [String],
      default: [],
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

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters."],
      maxlength: [140, "Product name cannot exceed 140 characters."],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required."],
      index: true,
    },

    price: {
      type: Number,
      required: [true, "Product price is required."],
      min: [0, "Product price cannot be negative."],
    },

    compareAtPrice: {
      type: Number,
      default: 0,
      min: [0, "Compare-at price cannot be negative."],
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: [280, "Short description cannot exceed 280 characters."],
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: [4000, "Description cannot exceed 4000 characters."],
      default: "",
    },

    fabric: {
      type: String,
      trim: true,
      maxlength: [120, "Fabric cannot exceed 120 characters."],
      default: "",
    },

    fit: {
      type: String,
      trim: true,
      maxlength: [120, "Fit cannot exceed 120 characters."],
      default: "",
    },

    careInstructions: {
      type: String,
      trim: true,
      maxlength: [800, "Care instructions cannot exceed 800 characters."],
      default: "",
    },

    colors: {
      type: [productColorSchema],
      default: [],
      validate: {
        validator(colors) {
          return Array.isArray(colors) && colors.length > 0;
        },
        message: "Product must have at least one color.",
      },
    },

    badges: {
      type: [String],
      default: [],
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
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
        type: productArabicTranslationSchema,
        default: () => ({}),
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }

  if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

  if (this.compareAtPrice && this.compareAtPrice < this.price) {
    this.compareAtPrice = 0;
  }

});

productSchema.virtual("totalStock").get(function () {
  if (!Array.isArray(this.colors)) return 0;

  return this.colors.reduce((productTotal, color) => {
    if (!Array.isArray(color.sizes)) return productTotal;

    const colorStock = color.sizes.reduce((sizeTotal, size) => {
      if (!size.isActive) return sizeTotal;
      return sizeTotal + Number(size.stock || 0);
    }, 0);

    return productTotal + colorStock;
  }, 0);
});

productSchema.virtual("primaryImage").get(function () {
  const activeColors = Array.isArray(this.colors)
    ? this.colors.filter((color) => color.isActive)
    : [];

  for (const color of activeColors) {
    const images = Array.isArray(color.images) ? color.images : [];

    const primaryImage =
      images.find((image) => image.role === "primary") || images[0];

    if (primaryImage?.url) {
      return primaryImage.url;
    }
  }

  return "";
});

productSchema.virtual("hoverImage").get(function () {
  const activeColors = Array.isArray(this.colors)
    ? this.colors.filter((color) => color.isActive)
    : [];

  for (const color of activeColors) {
    const images = Array.isArray(color.images) ? color.images : [];

    const hoverImage =
      images.find((image) => image.role === "hover") || images[1];

    if (hoverImage?.url) {
      return hoverImage.url;
    }
  }

  return "";
});

productSchema.index({ name: "text", description: "text", shortDescription: "text" });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ status: 1, "colors.slug": 1 });

module.exports = mongoose.model("Product", productSchema);
