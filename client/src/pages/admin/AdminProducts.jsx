import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";

import { getAdminCategoriesRequest } from "../../services/categoryService";
import {
  createProductRequest,
  deleteProductRequest,
  getAdminProductsRequest,
  updateProductRequest,
} from "../../services/productService";
import { uploadImageRequest } from "../../services/uploadService";

const emptyImage = {
  url: "",
  publicId: "",
  alt: "",
  arAlt: "",
  role: "gallery",
  position: 0,
};

const emptySize = {
  label: "",
  sku: "",
  stock: 0,
  isActive: true,
};

const emptyColor = {
  name: "",
  arName: "",
  slug: "",
  hex: "#111111",
  isActive: true,
  images: [{ ...emptyImage, role: "primary", position: 1 }],
  sizes: [{ ...emptySize }],
};

const emptyForm = {
  name: "",
  slug: "",
  category: "",
  price: "",
  compareAtPrice: "",
  shortDescription: "",
  description: "",
  fabric: "",
  fit: "",
  care: "",
  badgesText: "",
  isFeatured: false,
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  arName: "",
  arShortDescription: "",
  arDescription: "",
  arFabric: "",
  arFit: "",
  arCare: "",
  arBadgesText: "",
  arSeoTitle: "",
  arSeoDescription: "",
  colors: [{ ...emptyColor }],
};

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const imageRoleOptions = [
  { value: "primary", label: "Primary" },
  { value: "hover", label: "Hover" },
  { value: "gallery", label: "Gallery" },
];

const formatMoney = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(number);
};

const getCategoryId = (category) => {
  if (!category) return "";
  if (typeof category === "string") return category;
  return category._id || category.id || "";
};

const normalizeProductForForm = (product) => {
  return {
    name: product.name || "",
    slug: product.slug || "",
    category: getCategoryId(product.category),
    price: product.price ?? "",
    compareAtPrice: product.compareAtPrice ?? "",
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    fabric: product.fabric || "",
    fit: product.fit || "",
    care: product.careInstructions || product.care || "",
    badgesText: Array.isArray(product.badges) ? product.badges.join(", ") : "",
    isFeatured: Boolean(product.isFeatured),
    status: product.status || "draft",
    seoTitle: product.seo?.title || "",
    seoDescription: product.seo?.description || "",
    arName: product.translations?.ar?.name || "",
    arShortDescription:
      product.translations?.ar?.shortDescription || "",
    arDescription: product.translations?.ar?.description || "",
    arFabric: product.translations?.ar?.fabric || "",
    arFit: product.translations?.ar?.fit || "",
    arCare: product.translations?.ar?.care || "",
    arBadgesText: Array.isArray(product.translations?.ar?.badges)
      ? product.translations.ar.badges.join(", ")
      : "",
    arSeoTitle: product.translations?.ar?.seo?.title || "",
    arSeoDescription:
      product.translations?.ar?.seo?.description || "",
    colors:
      product.colors?.length > 0
        ? product.colors.map((color) => ({
            name: color.name || "",
            arName: color.translations?.ar?.name || "",
            slug: color.slug || "",
            hex: color.hex || "#111111",
            isActive: color.isActive !== false,
            images:
              color.images?.length > 0
                ? color.images.map((image, index) => ({
                    url: image.url || "",
                    publicId: image.publicId || "",
                    alt: image.alt || "",
                    arAlt: image.translations?.ar?.alt || "",
                    role: image.role || "gallery",
                    position: Number(image.position || index + 1),
                  }))
                : [{ ...emptyImage, role: "primary", position: 1 }],
            sizes:
              color.sizes?.length > 0
                ? color.sizes.map((size) => ({
                    label: size.label || "",
                    sku: size.sku || "",
                    stock: Number(size.stock || 0),
                    isActive: size.isActive !== false,
                  }))
                : [{ ...emptySize }],
          }))
        : [{ ...emptyColor }],
  };
};

const AdminProducts = () => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
  });
  const [uploadingKey, setUploadingKey] = useState("");

  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
    error: categoriesError,
  } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategoriesRequest,
  });

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ["admin-products", filters],
    queryFn: () =>
      getAdminProductsRequest({
        search: filters.search || undefined,
        status: filters.status || undefined,
        category: filters.category || undefined,
        limit: 100,
      }),
  });

  const categories = useMemo(
    () => categoriesData?.categories || [],
    [categoriesData]
  );

  const products = useMemo(
    () => productsData?.products || [],
    [productsData]
  );

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setUploadingKey("");
    setFeedback({
      type: "",
      message: "",
    });
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateColorField = (colorIndex, field, value) => {
    setFormData((current) => {
      const colors = [...current.colors];
      colors[colorIndex] = {
        ...colors[colorIndex],
        [field]: value,
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const updateImageField = (colorIndex, imageIndex, field, value) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const images = [...colors[colorIndex].images];

      images[imageIndex] = {
        ...images[imageIndex],
        [field]: value,
      };

      colors[colorIndex] = {
        ...colors[colorIndex],
        images,
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const updateSizeField = (colorIndex, sizeIndex, field, value) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const sizes = [...colors[colorIndex].sizes];

      sizes[sizeIndex] = {
        ...sizes[sizeIndex],
        [field]: value,
      };

      colors[colorIndex] = {
        ...colors[colorIndex],
        sizes,
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const addColor = () => {
    setFormData((current) => ({
      ...current,
      colors: [...current.colors, { ...emptyColor }],
    }));
  };

  const removeColor = (colorIndex) => {
    setFormData((current) => {
      if (current.colors.length <= 1) return current;

      return {
        ...current,
        colors: current.colors.filter((_, index) => index !== colorIndex),
      };
    });
  };

  const addImage = (colorIndex) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const images = [...colors[colorIndex].images];

      images.push({
        ...emptyImage,
        role: images.length === 0 ? "primary" : "gallery",
        position: images.length + 1,
      });

      colors[colorIndex] = {
        ...colors[colorIndex],
        images,
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const removeImage = (colorIndex, imageIndex) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const images = colors[colorIndex].images.filter(
        (_, index) => index !== imageIndex
      );

      colors[colorIndex] = {
        ...colors[colorIndex],
        images:
          images.length > 0
            ? images
            : [{ ...emptyImage, role: "primary", position: 1 }],
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const addSize = (colorIndex) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const sizes = [...colors[colorIndex].sizes];

      sizes.push({ ...emptySize });

      colors[colorIndex] = {
        ...colors[colorIndex],
        sizes,
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const removeSize = (colorIndex, sizeIndex) => {
    setFormData((current) => {
      const colors = [...current.colors];
      const sizes = colors[colorIndex].sizes.filter(
        (_, index) => index !== sizeIndex
      );

      colors[colorIndex] = {
        ...colors[colorIndex],
        sizes: sizes.length > 0 ? sizes : [{ ...emptySize }],
      };

      return {
        ...current,
        colors,
      };
    });
  };

  const handleImageUpload = async (colorIndex, imageIndex, file) => {
    if (!file) return;

    const uploadKey = `${colorIndex}-${imageIndex}`;

    setUploadingKey(uploadKey);
    setFeedback({ type: "", message: "" });

    try {
      const response = await uploadImageRequest(file, {
        folder: "products",
      });

      const uploadedImage = response.image;

      updateImageField(colorIndex, imageIndex, "url", uploadedImage.url);
      updateImageField(
        colorIndex,
        imageIndex,
        "publicId",
        uploadedImage.publicId
      );

      showFeedback("success", "Image uploaded successfully.");
    } catch (err) {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Image upload failed. Check Cloudinary settings."
      );
    } finally {
      setUploadingKey("");
    }
  };

  const buildPayload = () => {
    const badges = formData.badgesText
      .split(",")
      .map((badge) => badge.trim())
      .filter(Boolean);
    const arabicBadges = formData.arBadgesText
      .split(",")
      .map((badge) => badge.trim())
      .filter(Boolean);

    return {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      category: formData.category,
      price: Number(formData.price || 0),
      compareAtPrice: Number(formData.compareAtPrice || 0),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      fabric: formData.fabric.trim(),
      fit: formData.fit.trim(),
      careInstructions: formData.care.trim(),
      badges,
      isFeatured: Boolean(formData.isFeatured),
      status: formData.status,
      seo: {
        title: formData.seoTitle.trim(),
        description: formData.seoDescription.trim(),
      },
      translations: {
        ar: {
          name: formData.arName.trim(),
          shortDescription: formData.arShortDescription.trim(),
          description: formData.arDescription.trim(),
          fabric: formData.arFabric.trim(),
          fit: formData.arFit.trim(),
          care: formData.arCare.trim(),
          badges: arabicBadges,
          seo: {
            title: formData.arSeoTitle.trim(),
            description: formData.arSeoDescription.trim(),
          },
        },
      },
      colors: formData.colors.map((color) => ({
        name: color.name.trim(),
        translations: {
          ar: {
            name: color.arName.trim(),
          },
        },
        slug: color.slug.trim(),
        hex: color.hex.trim(),
        isActive: Boolean(color.isActive),
        images: color.images
          .map((image, index) => ({
            url: image.url.trim(),
            publicId: image.publicId.trim(),
            alt: image.alt.trim(),
            translations: {
              ar: {
                alt: image.arAlt.trim(),
              },
            },
            role: image.role,
            position: Number(image.position || index + 1),
          }))
          .filter((image) => image.url),
        sizes: color.sizes
          .map((size) => ({
            label: size.label.trim(),
            sku: size.sku.trim(),
            stock: Number(size.stock || 0),
            isActive: Boolean(size.isActive),
          }))
          .filter((size) => size.label),
      })),
    };
  };

  const validatePayload = (payload) => {
    if (!payload.name) return "Product name is required.";
    if (!payload.category) return "Product category is required.";
    if (payload.price <= 0) return "Product price must be greater than 0.";
    if (!payload.colors.length) return "At least one color is required.";

    for (const color of payload.colors) {
      if (!color.name) return "Each color needs a name.";
      if (!color.sizes.length) return `${color.name} needs at least one size.`;
    }

    return "";
  };

  const createMutation = useMutation({
    mutationFn: createProductRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      resetForm();
      showFeedback("success", response?.message || "Product created.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to create product."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      updateProductRequest(productId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      resetForm();
      showFeedback("success", response?.message || "Product updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to update product."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      showFeedback("success", response?.message || "Product deleted.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to delete product."
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = buildPayload();
    const validationError = validatePayload(payload);

    if (validationError) {
      showFeedback("error", validationError);
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        productId: editingId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData(normalizeProductForForm(product));
    setFeedback({ type: "", message: "" });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? If orders use this product later, archive is safer.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(product._id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Products"
        description="Create and manage Davinto products with colors, size stock, gallery images, hover images, and Cloudinary upload support."
        className="pt-0"
      />

      <div className="grid gap-6 2xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Product Form
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {editingId ? "Edit Product" : "Create Product"}
              </h2>
            </div>

            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>

          {feedback.message && (
            <div
              className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : "border-red-300/25 bg-red-400/10 text-red-100"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={updateField}
                placeholder="Davinto Oversized T-Shirt"
              />

              <Input
                label="Slug"
                name="slug"
                value={formData.slug}
                onChange={updateField}
                placeholder="Leave empty to auto-generate"
              />

              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={updateField}
                disabled={isLoadingCategories}
              >
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={updateField}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Price"
                name="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={updateField}
                placeholder="750"
              />

              <Input
                label="Compare At Price"
                name="compareAtPrice"
                type="number"
                min="0"
                value={formData.compareAtPrice}
                onChange={updateField}
                placeholder="900"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={updateField}
              />

              <span className="text-sm font-bold text-white/65">
                Featured product
              </span>
            </label>

            <Input
              label="Badges"
              name="badgesText"
              value={formData.badgesText}
              onChange={updateField}
              placeholder="New Arrival, Best Seller"
            />

            <Textarea
              label="Short Description"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={updateField}
              placeholder="Short text used near product cards/details..."
            />

            <Textarea
              label="Full Description"
              name="description"
              value={formData.description}
              onChange={updateField}
              placeholder="Full product description..."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Fabric"
                name="fabric"
                value={formData.fabric}
                onChange={updateField}
                placeholder="100% cotton"
              />

              <Input
                label="Fit"
                name="fit"
                value={formData.fit}
                onChange={updateField}
                placeholder="Oversized fit"
              />

              <Input
                label="Care"
                name="care"
                value={formData.care}
                onChange={updateField}
                placeholder="Wash inside out"
              />
            </div>

            <div className="rounded-3xl border border-[#c7a852]/25 bg-[#c7a852]/5 p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                Arabic Content
              </p>

              <div className="space-y-4" dir="rtl">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Arabic Product Name"
                    name="arName"
                    value={formData.arName}
                    onChange={updateField}
                    placeholder="اسم المنتج بالعربية"
                  />

                  <Input
                    label="Arabic Badges"
                    name="arBadgesText"
                    value={formData.arBadgesText}
                    onChange={updateField}
                    placeholder="جديد، الأكثر مبيعًا"
                  />
                </div>

                <Textarea
                  label="Arabic Short Description"
                  name="arShortDescription"
                  value={formData.arShortDescription}
                  onChange={updateField}
                  placeholder="وصف مختصر للمنتج بالعربية"
                />

                <Textarea
                  label="Arabic Full Description"
                  name="arDescription"
                  value={formData.arDescription}
                  onChange={updateField}
                  placeholder="الوصف الكامل للمنتج بالعربية"
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Arabic Fabric"
                    name="arFabric"
                    value={formData.arFabric}
                    onChange={updateField}
                    placeholder="الخامة بالعربية"
                  />

                  <Input
                    label="Arabic Fit"
                    name="arFit"
                    value={formData.arFit}
                    onChange={updateField}
                    placeholder="القصة بالعربية"
                  />

                  <Input
                    label="Arabic Care"
                    name="arCare"
                    value={formData.arCare}
                    onChange={updateField}
                    placeholder="تعليمات العناية بالعربية"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Arabic SEO Title"
                    name="arSeoTitle"
                    value={formData.arSeoTitle}
                    onChange={updateField}
                    placeholder="عنوان المنتج لمحركات البحث"
                  />

                  <Input
                    label="Arabic SEO Description"
                    name="arSeoDescription"
                    value={formData.arSeoDescription}
                    onChange={updateField}
                    placeholder="وصف البحث بالعربية"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                    Colors
                  </p>

                  <h3 className="mt-2 text-xl font-black uppercase">
                    Product Variants
                  </h3>
                </div>

                <Button type="button" variant="secondary" onClick={addColor}>
                  Add Color
                </Button>
              </div>

              <div className="space-y-5">
                {formData.colors.map((color, colorIndex) => (
                  <div
                    key={`color-${colorIndex}`}
                    className="rounded-3xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                          Color #{colorIndex + 1}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addImage(colorIndex)}
                        >
                          Add Image
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addSize(colorIndex)}
                        >
                          Add Size
                        </Button>

                        {formData.colors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColor(colorIndex)}
                            className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Input
                        label="Color Name"
                        value={color.name}
                        onChange={(event) =>
                          updateColorField(
                            colorIndex,
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="Black"
                      />

                      <Input
                        label="Arabic Color Name"
                        value={color.arName}
                        onChange={(event) =>
                          updateColorField(
                            colorIndex,
                            "arName",
                            event.target.value
                          )
                        }
                        placeholder="أسود"
                        dir="rtl"
                      />

                      <Input
                        label="Color Slug"
                        value={color.slug}
                        onChange={(event) =>
                          updateColorField(
                            colorIndex,
                            "slug",
                            event.target.value
                          )
                        }
                        placeholder="black"
                      />

                      <Input
                        label="Hex"
                        type="color"
                        value={color.hex || "#111111"}
                        onChange={(event) =>
                          updateColorField(
                            colorIndex,
                            "hex",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={color.isActive}
                        onChange={(event) =>
                          updateColorField(
                            colorIndex,
                            "isActive",
                            event.target.checked
                          )
                        }
                      />

                      <span className="text-sm font-bold text-white/65">
                        Color active
                      </span>
                    </label>

                    <div className="mt-6">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                        Images
                      </p>

                      <div className="space-y-4">
                        {color.images.map((image, imageIndex) => {
                          const uploadKey = `${colorIndex}-${imageIndex}`;
                          const isUploading = uploadingKey === uploadKey;

                          return (
                            <div
                              key={`image-${colorIndex}-${imageIndex}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                            >
                              <div className="grid gap-4 xl:grid-cols-[100px_1fr]">
                                <div className="h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] xl:w-[100px]">
                                  {image.url ? (
                                    <img
                                      src={image.url}
                                      alt={image.alt || formData.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                                      No image
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-[1fr_170px_120px]">
                                    <Input
                                      label="Image URL"
                                      value={image.url}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "url",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Paste image URL or upload"
                                    />

                                    <Select
                                      label="Role"
                                      value={image.role}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "role",
                                          event.target.value
                                        )
                                      }
                                    >
                                      {imageRoleOptions.map((role) => (
                                        <option
                                          key={role.value}
                                          value={role.value}
                                        >
                                          {role.label}
                                        </option>
                                      ))}
                                    </Select>

                                    <Input
                                      label="Position"
                                      type="number"
                                      min="0"
                                      value={image.position}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "position",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-3">
                                    <Input
                                      label="Alt Text"
                                      value={image.alt}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "alt",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Black oversized shirt front"
                                    />

                                    <Input
                                      label="Arabic Alt Text"
                                      value={image.arAlt}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "arAlt",
                                          event.target.value
                                        )
                                      }
                                      placeholder="قميص أسود من الأمام"
                                      dir="rtl"
                                    />

                                    <Input
                                      label="Cloudinary Public ID"
                                      value={image.publicId}
                                      onChange={(event) =>
                                        updateImageField(
                                          colorIndex,
                                          imageIndex,
                                          "publicId",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Auto-filled after upload"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <label className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white">
                                      {isUploading
                                        ? "Uploading..."
                                        : "Upload Image"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={(event) =>
                                          handleImageUpload(
                                            colorIndex,
                                            imageIndex,
                                            event.target.files?.[0]
                                          )
                                        }
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeImage(colorIndex, imageIndex)
                                      }
                                      className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10"
                                    >
                                      Remove Image
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                        Sizes / Stock
                      </p>

                      <div className="space-y-3">
                        {color.sizes.map((size, sizeIndex) => (
                          <div
                            key={`size-${colorIndex}-${sizeIndex}`}
                            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[1fr_1fr_120px_110px_auto]"
                          >
                            <Input
                              label="Size"
                              value={size.label}
                              onChange={(event) =>
                                updateSizeField(
                                  colorIndex,
                                  sizeIndex,
                                  "label",
                                  event.target.value
                                )
                              }
                              placeholder="M"
                            />

                            <Input
                              label="SKU"
                              value={size.sku}
                              onChange={(event) =>
                                updateSizeField(
                                  colorIndex,
                                  sizeIndex,
                                  "sku",
                                  event.target.value
                                )
                              }
                              placeholder="DV-BLK-M"
                            />

                            <Input
                              label="Stock"
                              type="number"
                              min="0"
                              value={size.stock}
                              onChange={(event) =>
                                updateSizeField(
                                  colorIndex,
                                  sizeIndex,
                                  "stock",
                                  event.target.value
                                )
                              }
                            />

                            <label className="flex items-center gap-2 self-end rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                              <input
                                type="checkbox"
                                checked={size.isActive}
                                onChange={(event) =>
                                  updateSizeField(
                                    colorIndex,
                                    sizeIndex,
                                    "isActive",
                                    event.target.checked
                                  )
                                }
                              />

                              <span className="text-xs font-bold text-white/65">
                                Active
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => removeSize(colorIndex, sizeIndex)}
                              className="self-end rounded-full border border-red-300/20 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                SEO
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="SEO Title"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={updateField}
                  placeholder="Davinto product name"
                />

                <Input
                  label="SEO Description"
                  name="seoDescription"
                  value={formData.seoDescription}
                  onChange={updateField}
                  placeholder="Short search description"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Product List
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              {products.length} Products
            </h2>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_150px_1fr]">
            <Input
              label="Search"
              name="search"
              value={filters.search}
              onChange={updateFilter}
              placeholder="Search products..."
            />

            <Select
              label="Status"
              name="status"
              value={filters.status}
              onChange={updateFilter}
            >
              <option value="">All</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>

            <Select
              label="Category"
              name="category"
              value={filters.category}
              onChange={updateFilter}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          {isCategoriesError && (
            <div className="mb-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
              {categoriesError?.friendlyMessage ||
                categoriesError?.message ||
                "Failed to load categories."}
            </div>
          )}

          {isLoadingProducts && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
              Loading products...
            </div>
          )}

          {isProductsError && (
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
              {productsError?.friendlyMessage ||
                productsError?.message ||
                "Failed to load products."}
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
              No products yet. Create the first product from the form.
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length > 0 && (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                      {product.primaryImage ? (
                        <img
                          src={product.primaryImage}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black uppercase text-white">
                              {product.name}
                            </h3>

                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                              {product.status}
                            </span>

                            {product.isFeatured && (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                                Featured
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-white/40">
                            {product.category?.name || "No category"} ·{" "}
                            /product/{product.slug}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              {formatMoney(product.price)}
                            </span>

                            <span className="rounded-full border border-white/10 px-3 py-1">
                              Stock: {product.totalStock || 0}
                            </span>

                            <span className="rounded-full border border-white/10 px-3 py-1">
                              Colors: {product.colors?.length || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending}
                            className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminProducts;
