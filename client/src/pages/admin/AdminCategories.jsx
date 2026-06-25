import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";

import {
  createCategoryRequest,
  deleteCategoryRequest,
  getAdminCategoriesRequest,
  updateCategoryRequest,
} from "../../services/categoryService";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  status: "active",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
  arName: "",
  arDescription: "",
  arSeoTitle: "",
  arSeoDescription: "",
};

const statusLabels = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

const AdminCategories = () => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(emptyForm);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategoriesRequest,
  });

  const categories = useMemo(() => data?.categories || [], [data]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingCategoryId(null);
    setFeedback({ type: "", message: "" });
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const createMutation = useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      resetForm();
      showFeedback("success", response?.message || "Category created.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to create category."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ categoryId, payload }) =>
      updateCategoryRequest(categoryId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      resetForm();
      showFeedback("success", response?.message || "Category updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to update category."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      showFeedback("success", response?.message || "Category deleted.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage || err?.message || "Failed to delete category."
      );
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const buildPayload = () => {
    return {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      status: formData.status,
      sortOrder: Number(formData.sortOrder || 0),
      seo: {
        title: formData.seoTitle.trim(),
        description: formData.seoDescription.trim(),
      },
      translations: {
        ar: {
          name: formData.arName.trim(),
          description: formData.arDescription.trim(),
          seo: {
            title: formData.arSeoTitle.trim(),
            description: formData.arSeoDescription.trim(),
          },
        },
      },
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.name) {
      showFeedback("error", "Category name is required.");
      return;
    }

    if (editingCategoryId) {
      updateMutation.mutate({
        categoryId: editingCategoryId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (category) => {
    setEditingCategoryId(category._id);

    setFormData({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      status: category.status || "active",
      sortOrder: category.sortOrder || 0,
      seoTitle: category.seo?.title || "",
      seoDescription: category.seo?.description || "",
      arName: category.translations?.ar?.name || "",
      arDescription: category.translations?.ar?.description || "",
      arSeoTitle: category.translations?.ar?.seo?.title || "",
      arSeoDescription:
        category.translations?.ar?.seo?.description || "",
    });

    setFeedback({
      type: "",
      message: "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (category) => {
    const confirmed = window.confirm(
      `Delete "${category.name}"? If it has products, it will be archived instead.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(category._id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Categories"
        description="Create and manage Davinto product categories. Products will depend on these categories later."
        className="pt-0"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Category Form
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {editingCategoryId ? "Edit Category" : "Create Category"}
              </h2>
            </div>

            {editingCategoryId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancel
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Category Name"
              name="name"
              value={formData.name}
              onChange={updateField}
              placeholder="Example: Oversized T-Shirts"
            />

            <Input
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={updateField}
              placeholder="Leave empty to auto-generate"
            />

            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={updateField}
              placeholder="Short category description..."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Status"
                name="status"
                value={formData.status}
                onChange={updateField}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>

              <Input
                label="Sort Order"
                name="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={updateField}
                min="0"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-4">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                SEO Optional
              </p>

              <div className="space-y-4">
                <Input
                  label="SEO Title"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={updateField}
                  placeholder="Category page title"
                />

                <Textarea
                  label="SEO Description"
                  name="seoDescription"
                  value={formData.seoDescription}
                  onChange={updateField}
                  placeholder="Category page meta description"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#c7a852]/25 bg-[#c7a852]/5 p-4">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                Arabic Content
              </p>

              <div className="space-y-4" dir="rtl">
                <Input
                  label="Arabic Name"
                  name="arName"
                  value={formData.arName}
                  onChange={updateField}
                  placeholder="اسم التصنيف"
                />

                <Textarea
                  label="Arabic Description"
                  name="arDescription"
                  value={formData.arDescription}
                  onChange={updateField}
                  placeholder="وصف التصنيف بالعربية"
                />

                <Input
                  label="Arabic SEO Title"
                  name="arSeoTitle"
                  value={formData.arSeoTitle}
                  onChange={updateField}
                  placeholder="عنوان صفحة التصنيف بالعربية"
                />

                <Textarea
                  label="Arabic SEO Description"
                  name="arSeoDescription"
                  value={formData.arSeoDescription}
                  onChange={updateField}
                  placeholder="وصف محركات البحث بالعربية"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? editingCategoryId
                  ? "Updating..."
                  : "Creating..."
                : editingCategoryId
                  ? "Update Category"
                  : "Create Category"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Category List
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {categories.length} Categories
              </h2>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
              Loading categories...
            </div>
          )}

          {isError && (
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
              {error?.friendlyMessage ||
                error?.message ||
                "Failed to load categories."}
            </div>
          )}

          {!isLoading && !isError && categories.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
              No categories yet. Create the first Davinto category from the
              form.
            </div>
          )}

          {!isLoading && !isError && categories.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="bg-white/[0.045]">
                    <tr className="text-xs uppercase tracking-[0.2em] text-white/40">
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Slug</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Order</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categories.map((category) => (
                      <tr
                        key={category._id}
                        className="border-t border-white/10 text-sm text-white/70"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-white">
                              {category.name}
                            </p>

                            {category.description && (
                              <p className="mt-1 max-w-xs truncate text-xs text-white/35">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-white/45">
                          /category/{category.slug}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              category.status === "active"
                                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                                : category.status === "draft"
                                  ? "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
                                  : "border-white/10 bg-white/5 text-white/45"
                            }`}
                          >
                            {statusLabels[category.status] || category.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-white/45">
                          {category.sortOrder ?? 0}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              disabled={deleteMutation.isPending}
                              className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminCategories;
