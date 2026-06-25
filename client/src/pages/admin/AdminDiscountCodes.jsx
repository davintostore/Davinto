import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";

import {
  createDiscountCodeRequest,
  deleteDiscountCodeRequest,
  getAdminDiscountCodesRequest,
  updateDiscountCodeRequest,
} from "../../services/discountCodeService";

const emptyForm = {
  code: "",
  name: "",
  description: "",
  type: "percentage",
  value: "",
  maxDiscountAmount: "",
  minSubtotal: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
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

const AdminDiscountCodes = () => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });
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
    queryKey: ["admin-discount-codes", filters],
    queryFn: () =>
      getAdminDiscountCodesRequest({
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
  });

  const discountCodes = useMemo(
    () => data?.discountCodes || [],
    [data]
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
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase().replace(/\s+/g, "") : value,
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

  const buildPayload = () => {
    return {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      value: Number(formData.value || 0),
      maxDiscountAmount: Number(formData.maxDiscountAmount || 0),
      minSubtotal: Number(formData.minSubtotal || 0),
      usageLimit: Number(formData.usageLimit || 0),
      startsAt: formData.startsAt || null,
      endsAt: formData.endsAt || null,
      status: formData.status,
    };
  };

  const validatePayload = (payload) => {
    if (!payload.code) return "Discount code is required.";
    if (payload.value <= 0) return "Discount value must be greater than 0.";

    if (payload.type === "percentage" && payload.value > 100) {
      return "Percentage discount cannot be more than 100%.";
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
    mutationFn: createDiscountCodeRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      resetForm();
      showFeedback("success", response?.message || "Discount code created.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to create discount code."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ discountCodeId, payload }) =>
      updateDiscountCodeRequest(discountCodeId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      resetForm();
      showFeedback("success", response?.message || "Discount code updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to update discount code."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiscountCodeRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      showFeedback("success", response?.message || "Discount code deleted.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to delete discount code."
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
        discountCodeId: editingId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (discountCode) => {
    setEditingId(discountCode._id);

    setFormData({
      code: discountCode.code || "",
      name: discountCode.name || "",
      description: discountCode.description || "",
      type: discountCode.type || "percentage",
      value: discountCode.value ?? "",
      maxDiscountAmount: discountCode.maxDiscountAmount ?? "",
      minSubtotal: discountCode.minSubtotal ?? "",
      usageLimit: discountCode.usageLimit ?? "",
      startsAt: formatDateInput(discountCode.startsAt),
      endsAt: formatDateInput(discountCode.endsAt),
      status: discountCode.status || "draft",
    });

    setFeedback({ type: "", message: "" });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = (discountCode) => {
    const confirmed = window.confirm(
      `Delete "${discountCode.code}"? If it has been used before, it will be archived instead.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(discountCode._id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Discount Codes"
        description="Create checkout discount codes with percentage/fixed values, minimum subtotal rules, usage limits, and active dates."
        className="pt-0"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
                Discount Form
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase">
                {editingId ? "Edit Discount" : "Create Discount"}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Code"
              name="code"
              value={formData.code}
              onChange={updateField}
              placeholder="DAVINTO10"
            />

            <Input
              label="Name Optional"
              name="name"
              value={formData.name}
              onChange={updateField}
              placeholder="Launch discount"
            />

            <Textarea
              label="Description Optional"
              name="description"
              value={formData.description}
              onChange={updateField}
              placeholder="Internal note about this code..."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                name="type"
                value={formData.type}
                onChange={updateField}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </Select>

              <Input
                label={formData.type === "percentage" ? "Value %" : "Value EGP"}
                name="value"
                type="number"
                min="0"
                value={formData.value}
                onChange={updateField}
                placeholder={formData.type === "percentage" ? "10" : "100"}
              />

              <Input
                label="Max Discount Amount"
                name="maxDiscountAmount"
                type="number"
                min="0"
                value={formData.maxDiscountAmount}
                onChange={updateField}
                placeholder="0 = no max"
              />

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
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                  ? "Update Discount Code"
                  : "Create Discount Code"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Discounts
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              {discountCodes.length} Codes
            </h2>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
            <Input
              label="Search"
              name="search"
              value={filters.search}
              onChange={updateFilter}
              placeholder="Search code..."
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
          </div>

          {isLoading && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
              Loading discount codes...
            </div>
          )}

          {isError && (
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
              {error?.friendlyMessage ||
                error?.message ||
                "Failed to load discount codes."}
            </div>
          )}

          {!isLoading && !isError && discountCodes.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
              No discount codes yet. Create one from the form.
            </div>
          )}

          {!isLoading && !isError && discountCodes.length > 0 && (
            <div className="space-y-3">
              {discountCodes.map((discountCode) => (
                <div
                  key={discountCode._id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black uppercase text-white">
                          {discountCode.code}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                            discountCode.status
                          )}`}
                        >
                          {discountCode.status}
                        </span>
                      </div>

                      {discountCode.name && (
                        <p className="mt-2 text-sm font-bold text-white/65">
                          {discountCode.name}
                        </p>
                      )}

                      <div className="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                        <p>
                          Type:{" "}
                          <span className="text-white">
                            {discountCode.type}
                          </span>
                        </p>

                        <p>
                          Value:{" "}
                          <span className="text-white">
                            {discountCode.type === "percentage"
                              ? `${discountCode.value}%`
                              : formatMoney(discountCode.value)}
                          </span>
                        </p>

                        <p>
                          Min subtotal:{" "}
                          <span className="text-white">
                            {formatMoney(discountCode.minSubtotal)}
                          </span>
                        </p>

                        <p>
                          Max discount:{" "}
                          <span className="text-white">
                            {discountCode.maxDiscountAmount > 0
                              ? formatMoney(discountCode.maxDiscountAmount)
                              : "No max"}
                          </span>
                        </p>

                        <p>
                          Used:{" "}
                          <span className="text-white">
                            {discountCode.usedCount || 0}
                            {discountCode.usageLimit > 0
                              ? ` / ${discountCode.usageLimit}`
                              : " / unlimited"}
                          </span>
                        </p>

                        <p>
                          Ends:{" "}
                          <span className="text-white">
                            {discountCode.endsAt
                              ? new Date(
                                  discountCode.endsAt
                                ).toLocaleDateString()
                              : "No end date"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(discountCode)}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 transition hover:border-white/35 hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(discountCode)}
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
    </div>
  );
};

export default AdminDiscountCodes;