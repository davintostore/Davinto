import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import useSeo from "../../hooks/useSeo";

import {
  createBundleRequest,
  deleteBundleRequest,
  getAdminBundlesRequest,
  updateBundleRequest,
} from "../../services/bundleService";

import { getAdminCategoriesRequest } from "../../services/categoryService";
import { getAdminProductsRequest } from "../../services/productService";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  translations: {
    ar: {
      title: "",
      description: "",
    },
  },
  bundleMode: "anyProducts",
  eligibleScope: "all",
  categories: [],
  products: [],
  requiredQuantity: 2,
  pricingType: "fixedBundlePrice",
  bundlePrice: "",
  discountValue: "",
  maxDiscountAmount: "",
  allowMultipleApplications: true,
  stackable: false,
  priority: 0,
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  status: "draft",
};

const formatMoney = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const statusStyle = (status) => {
  if (status === "active") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "draft") {
    return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100";
  }

  return "border-white/10 bg-white/5 text-white/45";
};

const getSelectedIdsFromPopulatedArray = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => (typeof item === "string" ? item : item._id));
};

const getPricingLabel = (bundle) => {
  if (bundle.pricingType === "fixedBundlePrice") {
    return `${bundle.requiredQuantity} for ${formatMoney(bundle.bundlePrice)}`;
  }

  if (bundle.pricingType === "percentageOff") {
    return `${bundle.discountValue}% off`;
  }

  return `${formatMoney(bundle.discountValue)} off`;
};

const getModeLabel = (mode) => {
  if (mode === "specificProducts") return "Specific Products";
  return "Any Products";
};

const getScopeLabel = (scope) => {
  if (scope === "categories") return "Selected Categories";
  if (scope === "products") return "Selected Products";
  return "All Products";
};

const AdminBundles = () => {
  const queryClient = useQueryClient();

  // SEO
  useSeo({
    title: "Admin Bundles | Davinto Store",
    description: "Admin bundles management for Davinto Store.",
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    bundleMode: "",
    eligibleScope: "",
  });
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    data: bundlesData,
    isLoading: isLoadingBundles,
    isError: isBundlesError,
    error: bundlesError,
  } = useQuery({
    queryKey: ["admin-bundles", filters],
    queryFn: () =>
      getAdminBundlesRequest({
        search: filters.search || undefined,
        status: filters.status || undefined,
        bundleMode: filters.bundleMode || undefined,
        eligibleScope: filters.eligibleScope || undefined,
      }),
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategoriesRequest,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["admin-products", "bundle-picker"],
    queryFn: () =>
      getAdminProductsRequest({
        limit: 100,
      }),
  });

  const bundles = useMemo(() => bundlesData?.bundles || [], [bundlesData]);

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
    setFeedback({ type: "", message: "" });
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => {
      const nextValue = type === "checkbox" ? checked : value;

      const nextForm = {
        ...current,
        [name]: nextValue,
      };

      if (name === "bundleMode" && value === "specificProducts") {
        nextForm.eligibleScope = "products";
        nextForm.categories = [];
      }

      if (name === "bundleMode" && value === "anyProducts") {
        nextForm.eligibleScope = "all";
        nextForm.categories = [];
        nextForm.products = [];
      }

      if (name === "eligibleScope" && value === "all") {
        nextForm.categories = [];
        nextForm.products = [];
      }

      if (name === "eligibleScope" && value === "categories") {
        nextForm.products = [];
      }

      if (name === "eligibleScope" && value === "products") {
        nextForm.categories = [];
      }

      if (name === "pricingType" && value === "fixedBundlePrice") {
        nextForm.discountValue = "";
        nextForm.maxDiscountAmount = "";
      }

      if (name === "pricingType" && value !== "fixedBundlePrice") {
        nextForm.bundlePrice = "";
      }

      return nextForm;
    });

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const updateArabicField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      translations: {
        ...current.translations,
        ar: {
          ...current.translations.ar,
          [name]: value,
        },
      },
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

  const toggleCategory = (categoryId) => {
    setFormData((current) => {
      const exists = current.categories.includes(categoryId);

      return {
        ...current,
        categories: exists
          ? current.categories.filter((id) => id !== categoryId)
          : [...current.categories, categoryId],
      };
    });
  };

  const toggleProduct = (productId) => {
    setFormData((current) => {
      const exists = current.products.includes(productId);

      return {
        ...current,
        products: exists
          ? current.products.filter((id) => id !== productId)
          : [...current.products, productId],
      };
    });
  };

  const buildPayload = () => {
    return {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      translations: {
        ar: {
          title: formData.translations.ar.title.trim(),
          description: formData.translations.ar.description.trim(),
        },
      },
      bundleMode: formData.bundleMode,
      eligibleScope:
        formData.bundleMode === "specificProducts"
          ? "products"
          : formData.eligibleScope,
      categories:
        formData.bundleMode === "anyProducts" &&
        formData.eligibleScope === "categories"
          ? formData.categories
          : [],
      products:
        formData.bundleMode === "specificProducts" ||
        formData.eligibleScope === "products"
          ? formData.products
          : [],
      requiredQuantity: Number(formData.requiredQuantity || 2),
      pricingType: formData.pricingType,
      bundlePrice:
        formData.pricingType === "fixedBundlePrice"
          ? Number(formData.bundlePrice || 0)
          : 0,
      discountValue:
        formData.pricingType !== "fixedBundlePrice"
          ? Number(formData.discountValue || 0)
          : 0,
      maxDiscountAmount:
        formData.pricingType !== "fixedBundlePrice"
          ? Number(formData.maxDiscountAmount || 0)
          : 0,
      allowMultipleApplications: Boolean(formData.allowMultipleApplications),
      stackable: Boolean(formData.stackable),
      priority: Number(formData.priority || 0),
      startsAt: formData.startsAt || null,
      endsAt: formData.endsAt || null,
      usageLimit: Number(formData.usageLimit || 0),
      status: formData.status,
    };
  };

  const validatePayload = (payload) => {
    if (!payload.title) return "Bundle title is required.";

    if (payload.requiredQuantity < 2) {
      return "Bundle required quantity must be at least 2.";
    }

    if (payload.pricingType === "fixedBundlePrice" && payload.bundlePrice <= 0) {
      return "Fixed bundle price must be greater than 0.";
    }

    if (
      payload.pricingType !== "fixedBundlePrice" &&
      payload.discountValue <= 0
    ) {
      return "Bundle discount value must be greater than 0.";
    }

    if (payload.pricingType === "percentageOff" && payload.discountValue > 100) {
      return "Percentage discount cannot be greater than 100%.";
    }

    if (
      payload.bundleMode === "specificProducts" &&
      payload.products.length < 2
    ) {
      return "Specific products bundle needs at least two selected products.";
    }

    if (
      payload.bundleMode === "specificProducts" &&
      payload.requiredQuantity > payload.products.length
    ) {
      return "Required quantity cannot be greater than selected products count.";
    }

    if (
      payload.bundleMode === "anyProducts" &&
      payload.eligibleScope === "categories" &&
      payload.categories.length === 0
    ) {
      return "Choose at least one category for this bundle.";
    }

    if (
      payload.bundleMode === "anyProducts" &&
      payload.eligibleScope === "products" &&
      payload.products.length === 0
    ) {
      return "Choose at least one product for this bundle.";
    }

    if (
      payload.startsAt &&
      payload.endsAt &&
      new Date(payload.startsAt) > new Date(payload.endsAt)
    ) {
      return "Start date cannot be after end date.";
    }

    return "";
  };

  const createMutation = useMutation({
    mutationFn: createBundleRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      resetForm();
      showFeedback("success", response?.message || "Bundle created.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to create bundle."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ bundleId, payload }) =>
      updateBundleRequest(bundleId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      resetForm();
      showFeedback("success", response?.message || "Bundle updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to update bundle."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBundleRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      showFeedback("success", response?.message || "Bundle deleted.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to delete bundle."
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
        bundleId: editingId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (bundle) => {
    setEditingId(bundle._id);

    setFormData({
      title: bundle.title || "",
      slug: bundle.slug || "",
      description: bundle.description || "",
      translations: {
        ar: {
          title: bundle.translations?.ar?.title || "",
          description: bundle.translations?.ar?.description || "",
        },
      },
      bundleMode: bundle.bundleMode || "anyProducts",
      eligibleScope: bundle.eligibleScope || "all",
      categories: getSelectedIdsFromPopulatedArray(bundle.categories),
      products: getSelectedIdsFromPopulatedArray(bundle.products),
      requiredQuantity: bundle.requiredQuantity ?? 2,
      pricingType: bundle.pricingType || "fixedBundlePrice",
      bundlePrice: bundle.bundlePrice ?? "",
      discountValue: bundle.discountValue ?? "",
      maxDiscountAmount: bundle.maxDiscountAmount ?? "",
      allowMultipleApplications: bundle.allowMultipleApplications !== false,
      stackable: Boolean(bundle.stackable),
      priority: bundle.priority ?? 0,
      startsAt: formatDateInput(bundle.startsAt),
      endsAt: formatDateInput(bundle.endsAt),
      usageLimit: bundle.usageLimit ?? "",
      status: bundle.status || "draft",
    });

    setFeedback({ type: "", message: "" });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (bundle) => {
    setDeleteConfirm(bundle);
  };

  const confirmDelete = () => {
    if (!deleteConfirm?._id) return;

    deleteMutation.mutate(deleteConfirm._id, {
      onSettled: () => setDeleteConfirm(null),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Bundles"
        description="Create bundle rules for any products or specific products. Checkout application will be connected later through the quote engine."
        className="pt-0"
      />

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Bundle Form
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {editingId ? "Edit Bundle" : "Create Bundle"}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Bundle Title"
                name="title"
                value={formData.title}
                onChange={updateField}
                placeholder="Buy 2 For 1000"
              />

              <Input
                label="Slug"
                name="slug"
                value={formData.slug}
                onChange={updateField}
                placeholder="Leave empty to auto-generate"
              />
            </div>

            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={updateField}
              placeholder="Short bundle description..."
            />

            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                Arabic Content
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Arabic Title"
                  name="title"
                  dir="rtl"
                  value={formData.translations.ar.title}
                  onChange={updateArabicField}
                  placeholder="عنوان الباقة بالعربية"
                />

                <Textarea
                  label="Arabic Description"
                  name="description"
                  dir="rtl"
                  value={formData.translations.ar.description}
                  onChange={updateArabicField}
                  placeholder="وصف الباقة بالعربية..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Bundle Mode"
                name="bundleMode"
                value={formData.bundleMode}
                onChange={updateField}
              >
                <option value="anyProducts">Any Products</option>
                <option value="specificProducts">Specific Products</option>
              </Select>

              <Select
                label="Eligible Scope"
                name="eligibleScope"
                value={formData.eligibleScope}
                onChange={updateField}
                disabled={formData.bundleMode === "specificProducts"}
              >
                <option value="all">All Products</option>
                <option value="categories">Selected Categories</option>
                <option value="products">Selected Products</option>
              </Select>

              <Input
                label="Required Quantity"
                name="requiredQuantity"
                type="number"
                min="2"
                value={formData.requiredQuantity}
                onChange={updateField}
                placeholder="2"
              />

              <Select
                label="Pricing Type"
                name="pricingType"
                value={formData.pricingType}
                onChange={updateField}
              >
                <option value="fixedBundlePrice">Fixed Bundle Price</option>
                <option value="percentageOff">Percentage Off</option>
                <option value="fixedDiscount">Fixed Discount</option>
              </Select>

              <Input
                label="Bundle Price"
                name="bundlePrice"
                type="number"
                min="0"
                value={formData.bundlePrice}
                onChange={updateField}
                disabled={formData.pricingType !== "fixedBundlePrice"}
                placeholder="1000"
              />

              <Input
                label={
                  formData.pricingType === "percentageOff"
                    ? "Discount %"
                    : "Discount EGP"
                }
                name="discountValue"
                type="number"
                min="0"
                value={formData.discountValue}
                onChange={updateField}
                disabled={formData.pricingType === "fixedBundlePrice"}
                placeholder={
                  formData.pricingType === "percentageOff" ? "10" : "150"
                }
              />

              <Input
                label="Max Discount Amount"
                name="maxDiscountAmount"
                type="number"
                min="0"
                value={formData.maxDiscountAmount}
                onChange={updateField}
                disabled={formData.pricingType === "fixedBundlePrice"}
                placeholder="0 = no max"
              />

              <Input
                label="Priority"
                name="priority"
                type="number"
                value={formData.priority}
                onChange={updateField}
                placeholder="Higher priority applies first later"
              />

              <Input
                label="Starts At"
                name="startsAt"
                type="date"
                value={formData.startsAt}
                onChange={updateField}
              />

              <Input
                label="Ends At"
                name="endsAt"
                type="date"
                value={formData.endsAt}
                onChange={updateField}
              />

              <Input
                label="Usage Limit"
                name="usageLimit"
                type="number"
                min="0"
                value={formData.usageLimit}
                onChange={updateField}
                placeholder="0 = unlimited"
              />

              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={updateField}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <input
                  type="checkbox"
                  name="allowMultipleApplications"
                  checked={formData.allowMultipleApplications}
                  onChange={updateField}
                />
                <span className="text-sm font-bold text-white/65">
                  Allow multiple applications later
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <input
                  type="checkbox"
                  name="stackable"
                  checked={formData.stackable}
                  onChange={updateField}
                />
                <span className="text-sm font-bold text-white/65">
                  Stackable with other offers later
                </span>
              </label>
            </div>

            {formData.bundleMode === "anyProducts" &&
              formData.eligibleScope === "categories" && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                    Selected Categories
                  </p>

                  {isLoadingCategories ? (
                    <p className="mt-4 text-sm text-white/45">
                      Loading categories...
                    </p>
                  ) : categories.length === 0 ? (
                    <p className="mt-4 text-sm text-white/45">
                      No categories found. Create categories first.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {categories.map((category) => (
                        <label
                          key={category._id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(category._id)}
                            onChange={() => toggleCategory(category._id)}
                          />

                          <span className="text-sm font-bold text-white/65">
                            {category.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {(formData.bundleMode === "specificProducts" ||
              formData.eligibleScope === "products") && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                  Selected Products
                </p>

                {isLoadingProducts ? (
                  <p className="mt-4 text-sm text-white/45">
                    Loading products...
                  </p>
                ) : products.length === 0 ? (
                  <p className="mt-4 text-sm text-white/45">
                    No products found. Create products first.
                  </p>
                ) : (
                  <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {products.map((product) => (
                      <label
                        key={product._id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.products.includes(product._id)}
                            onChange={() => toggleProduct(product._id)}
                          />

                          <span className="text-sm font-bold text-white/65">
                            {product.name}
                          </span>
                        </div>

                        <span className="text-xs text-white/35">
                          {formatMoney(product.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                  ? "Update Bundle"
                  : "Create Bundle"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Bundle List
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              {bundles.length} Bundles
            </h2>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_150px_170px_170px]">
            <Input
              label="Search"
              name="search"
              value={filters.search}
              onChange={updateFilter}
              placeholder="Search bundles..."
            />

            <Select
              label="Status"
              name="status"
              value={filters.status}
              onChange={updateFilter}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>

            <Select
              label="Mode"
              name="bundleMode"
              value={filters.bundleMode}
              onChange={updateFilter}
            >
              <option value="">All</option>
              <option value="anyProducts">Any Products</option>
              <option value="specificProducts">Specific Products</option>
            </Select>

            <Select
              label="Scope"
              name="eligibleScope"
              value={filters.eligibleScope}
              onChange={updateFilter}
            >
              <option value="">All</option>
              <option value="all">All</option>
              <option value="categories">Categories</option>
              <option value="products">Products</option>
            </Select>
          </div>

          {isLoadingBundles && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
              Loading bundles...
            </div>
          )}

          {isBundlesError && (
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
              {bundlesError?.friendlyMessage ||
                bundlesError?.message ||
                "Failed to load bundles."}
            </div>
          )}

          {!isLoadingBundles && !isBundlesError && bundles.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
              No bundles yet. Create the first bundle from the form.
            </div>
          )}

          {!isLoadingBundles && !isBundlesError && bundles.length > 0 && (
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle._id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black uppercase text-white">
                          {bundle.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                            bundle.status
                          )}`}
                        >
                          {bundle.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-bold text-white/65">
                        {getPricingLabel(bundle)}
                      </p>

                      <p className="mt-1 text-xs text-white/35">
                        /bundles/{bundle.slug}
                      </p>

                      <div className="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                        <p>
                          Mode:{" "}
                          <span className="text-white">
                            {getModeLabel(bundle.bundleMode)}
                          </span>
                        </p>

                        <p>
                          Scope:{" "}
                          <span className="text-white">
                            {getScopeLabel(bundle.eligibleScope)}
                          </span>
                        </p>

                        <p>
                          Required Qty:{" "}
                          <span className="text-white">
                            {bundle.requiredQuantity}
                          </span>
                        </p>

                        <p>
                          Priority:{" "}
                          <span className="text-white">{bundle.priority}</span>
                        </p>

                        <p>
                          Multiple:{" "}
                          <span className="text-white">
                            {bundle.allowMultipleApplications ? "Yes" : "No"}
                          </span>
                        </p>

                        <p>
                          Used:{" "}
                          <span className="text-white">
                            {bundle.usedCount || 0}
                            {bundle.usageLimit > 0
                              ? ` / ${bundle.usageLimit}`
                              : " / unlimited"}
                          </span>
                        </p>

                        <p>
                          Ends:{" "}
                          <span className="text-white">
                            {bundle.endsAt
                              ? new Date(bundle.endsAt).toLocaleDateString()
                              : "No end date"}
                          </span>
                        </p>
                      </div>

                      {bundle.eligibleScope === "categories" &&
                        bundle.categories?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {bundle.categories.map((category) => (
                              <span
                                key={category._id}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45"
                              >
                                {category.name}
                              </span>
                            ))}
                          </div>
                        )}

                      {bundle.eligibleScope === "products" &&
                        bundle.products?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {bundle.products.slice(0, 6).map((product) => (
                              <span
                                key={product._id}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45"
                              >
                                {product.name}
                              </span>
                            ))}

                            {bundle.products.length > 6 && (
                              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                                +{bundle.products.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(bundle)}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(bundle)}
                        disabled={deleteMutation.isPending}
                        className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        eyebrow="Delete Bundle"
        title={
          deleteConfirm ? `Delete ${deleteConfirm.title}?` : "Delete bundle?"
        }
        message="If it has usage history, it will be archived instead."
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminBundles;
