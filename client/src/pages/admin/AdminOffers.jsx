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
  createOfferRequest,
  deleteOfferRequest,
  getAdminOffersRequest,
  updateOfferRequest,
} from "../../services/offerService";

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
  discountType: "percentage",
  discountValue: "",
  maxDiscountAmount: "",
  scope: "all",
  categories: [],
  products: [],
  minSubtotal: "",
  minQuantity: "",
  priority: 0,
  stackable: false,
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

const getDiscountLabel = (offer) => {
  if (offer.discountType === "freeDelivery") return "Free Delivery";

  if (offer.discountType === "percentage") {
    return `${offer.discountValue}% off`;
  }

  if (offer.discountType === "fixedPerItem") {
    return `${formatMoney(offer.discountValue)} off per item`;
  }

  return `${formatMoney(offer.discountValue)} off`;
};

const getSelectedIdsFromPopulatedArray = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => (typeof item === "string" ? item : item._id));
};

const AdminOffers = () => {
  const queryClient = useQueryClient();

  // SEO
  useSeo({
    title: "Admin Offers | Davinto Store",
    description: "Admin offers management for Davinto Store.",
    robots: "noindex,nofollow",
  });

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    scope: "",
  });
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    data: offersData,
    isLoading: isLoadingOffers,
    isError: isOffersError,
    error: offersError,
  } = useQuery({
    queryKey: ["admin-offers", filters],
    queryFn: () =>
      getAdminOffersRequest({
        search: filters.search || undefined,
        status: filters.status || undefined,
        scope: filters.scope || undefined,
      }),
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategoriesRequest,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["admin-products", "offer-picker"],
    queryFn: () =>
      getAdminProductsRequest({
        limit: 100,
      }),
  });

  const offers = useMemo(() => offersData?.offers || [], [offersData]);
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

      if (name === "scope" && value === "all") {
        nextForm.categories = [];
        nextForm.products = [];
      }

      if (name === "scope" && value === "categories") {
        nextForm.products = [];
      }

      if (name === "scope" && value === "products") {
        nextForm.categories = [];
      }

      if (name === "discountType" && value === "freeDelivery") {
        nextForm.discountValue = "";
        nextForm.maxDiscountAmount = "";
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
      discountType: formData.discountType,
      discountValue:
        formData.discountType === "freeDelivery"
          ? 0
          : Number(formData.discountValue || 0),
      maxDiscountAmount:
        formData.discountType === "freeDelivery"
          ? 0
          : Number(formData.maxDiscountAmount || 0),
      scope: formData.scope,
      categories: formData.scope === "categories" ? formData.categories : [],
      products: formData.scope === "products" ? formData.products : [],
      minSubtotal: Number(formData.minSubtotal || 0),
      minQuantity: Number(formData.minQuantity || 0),
      priority: Number(formData.priority || 0),
      stackable: Boolean(formData.stackable),
      startsAt: formData.startsAt || null,
      endsAt: formData.endsAt || null,
      usageLimit: Number(formData.usageLimit || 0),
      status: formData.status,
    };
  };

  const validatePayload = (payload) => {
    if (!payload.title) return "Offer title is required.";

    if (payload.discountType !== "freeDelivery" && payload.discountValue <= 0) {
      return "Discount value must be greater than 0.";
    }

    if (payload.discountType === "percentage" && payload.discountValue > 100) {
      return "Percentage offer cannot be greater than 100%.";
    }

    if (payload.scope === "categories" && payload.categories.length === 0) {
      return "Choose at least one category for this offer.";
    }

    if (payload.scope === "products" && payload.products.length === 0) {
      return "Choose at least one product for this offer.";
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
    mutationFn: createOfferRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      resetForm();
      showFeedback("success", response?.message || "Offer created.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to create offer."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ offerId, payload }) => updateOfferRequest(offerId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      resetForm();
      showFeedback("success", response?.message || "Offer updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to update offer."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOfferRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      showFeedback("success", response?.message || "Offer deleted.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to delete offer."
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
        offerId: editingId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (offer) => {
    setEditingId(offer._id);

    setFormData({
      title: offer.title || "",
      slug: offer.slug || "",
      description: offer.description || "",
      translations: {
        ar: {
          title: offer.translations?.ar?.title || "",
          description: offer.translations?.ar?.description || "",
        },
      },
      discountType: offer.discountType || "percentage",
      discountValue: offer.discountValue ?? "",
      maxDiscountAmount: offer.maxDiscountAmount ?? "",
      scope: offer.scope || "all",
      categories: getSelectedIdsFromPopulatedArray(offer.categories),
      products: getSelectedIdsFromPopulatedArray(offer.products),
      minSubtotal: offer.minSubtotal ?? "",
      minQuantity: offer.minQuantity ?? "",
      priority: offer.priority ?? 0,
      stackable: Boolean(offer.stackable),
      startsAt: formatDateInput(offer.startsAt),
      endsAt: formatDateInput(offer.endsAt),
      usageLimit: offer.usageLimit ?? "",
      status: offer.status || "draft",
    });

    setFeedback({ type: "", message: "" });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (offer) => {
    setDeleteConfirm(offer);
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
        title="Offers"
        description="Create automatic offer rules for all products, selected categories, or selected products. Checkout application will be connected through the quote engine later."
        className="pt-0"
      />

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Offer Form
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {editingId ? "Edit Offer" : "Create Offer"}
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
                label="Offer Title"
                name="title"
                value={formData.title}
                onChange={updateField}
                placeholder="Launch Offer"
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
              placeholder="Short internal/public offer description..."
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
                  placeholder="عنوان العرض بالعربية"
                />

                <Textarea
                  label="Arabic Description"
                  name="description"
                  dir="rtl"
                  value={formData.translations.ar.description}
                  onChange={updateArabicField}
                  placeholder="وصف العرض بالعربية..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Discount Type"
                name="discountType"
                value={formData.discountType}
                onChange={updateField}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="fixedPerItem">Fixed Amount Per Item</option>
                <option value="freeDelivery">Free Delivery</option>
              </Select>

              <Input
                label={
                  formData.discountType === "percentage"
                    ? "Discount %"
                    : ["fixed", "fixedPerItem"].includes(
                          formData.discountType
                        )
                      ? "Discount EGP"
                      : "Discount Value"
                }
                name="discountValue"
                type="number"
                min="0"
                value={formData.discountValue}
                onChange={updateField}
                disabled={formData.discountType === "freeDelivery"}
                placeholder={
                  formData.discountType === "percentage" ? "10" : "100"
                }
              />

              <Input
                label="Max Discount Amount"
                name="maxDiscountAmount"
                type="number"
                min="0"
                value={formData.maxDiscountAmount}
                onChange={updateField}
                disabled={formData.discountType === "freeDelivery"}
                placeholder="0 = no max"
              />

              <Select
                label="Scope"
                name="scope"
                value={formData.scope}
                onChange={updateField}
              >
                <option value="all">All Products</option>
                <option value="categories">Selected Categories</option>
                <option value="products">Selected Products</option>
              </Select>

              <Input
                label="Minimum Subtotal"
                name="minSubtotal"
                type="number"
                min="0"
                value={formData.minSubtotal}
                onChange={updateField}
                placeholder="0 = no minimum"
              />

              <Input
                label="Minimum Quantity"
                name="minQuantity"
                type="number"
                min="0"
                value={formData.minQuantity}
                onChange={updateField}
                placeholder="0 = no minimum"
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
                label="Usage Limit"
                name="usageLimit"
                type="number"
                min="0"
                value={formData.usageLimit}
                onChange={updateField}
                placeholder="0 = unlimited"
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
                  name="stackable"
                  checked={formData.stackable}
                  onChange={updateField}
                />
                <span className="text-sm font-bold text-white/65">
                  Stackable with other offers later
                </span>
              </label>
            </div>

            {formData.scope === "categories" && (
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

            {formData.scope === "products" && (
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
                  ? "Update Offer"
                  : "Create Offer"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Offer List
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              {offers.length} Offers
            </h2>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_170px_170px]">
            <Input
              label="Search"
              name="search"
              value={filters.search}
              onChange={updateFilter}
              placeholder="Search offers..."
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
              label="Scope"
              name="scope"
              value={filters.scope}
              onChange={updateFilter}
            >
              <option value="">All</option>
              <option value="all">All</option>
              <option value="categories">Categories</option>
              <option value="products">Products</option>
            </Select>
          </div>

          {isLoadingOffers && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
              Loading offers...
            </div>
          )}

          {isOffersError && (
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
              {offersError?.friendlyMessage ||
                offersError?.message ||
                "Failed to load offers."}
            </div>
          )}

          {!isLoadingOffers && !isOffersError && offers.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
              No offers yet. Create the first automatic offer from the form.
            </div>
          )}

          {!isLoadingOffers && !isOffersError && offers.length > 0 && (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black uppercase text-white">
                          {offer.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                            offer.status
                          )}`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-bold text-white/65">
                        {getDiscountLabel(offer)}
                      </p>

                      <p className="mt-1 text-xs text-white/35">
                        /offers/{offer.slug}
                      </p>

                      <div className="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                        <p>
                          Scope:{" "}
                          <span className="text-white">{offer.scope}</span>
                        </p>

                        <p>
                          Priority:{" "}
                          <span className="text-white">{offer.priority}</span>
                        </p>

                        <p>
                          Min subtotal:{" "}
                          <span className="text-white">
                            {formatMoney(offer.minSubtotal)}
                          </span>
                        </p>

                        <p>
                          Min qty:{" "}
                          <span className="text-white">
                            {offer.minQuantity || 0}
                          </span>
                        </p>

                        <p>
                          Used:{" "}
                          <span className="text-white">
                            {offer.usedCount || 0}
                            {offer.usageLimit > 0
                              ? ` / ${offer.usageLimit}`
                              : " / unlimited"}
                          </span>
                        </p>

                        <p>
                          Ends:{" "}
                          <span className="text-white">
                            {offer.endsAt
                              ? new Date(offer.endsAt).toLocaleDateString()
                              : "No end date"}
                          </span>
                        </p>
                      </div>

                      {offer.scope === "categories" &&
                        offer.categories?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {offer.categories.map((category) => (
                              <span
                                key={category._id}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45"
                              >
                                {category.name}
                              </span>
                            ))}
                          </div>
                        )}

                      {offer.scope === "products" &&
                        offer.products?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {offer.products.slice(0, 6).map((product) => (
                              <span
                                key={product._id}
                                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45"
                              >
                                {product.name}
                              </span>
                            ))}

                            {offer.products.length > 6 && (
                              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
                                +{offer.products.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(offer)}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(offer)}
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
        eyebrow="Delete Offer"
        title={deleteConfirm ? `Delete ${deleteConfirm.title}?` : "Delete offer?"}
        message="If it has usage history, it will be archived instead."
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminOffers;
