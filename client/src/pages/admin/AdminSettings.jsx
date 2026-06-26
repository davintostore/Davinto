import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import Textarea from "../../components/ui/Textarea";

import {
  getAdminSettingsRequest,
  updateAdminSettingsRequest,
} from "../../services/settingsService";

import { sendAdminTestEmailRequest } from "../../services/notificationService";

const defaultForm = {
  store: {
    name: "Davinto",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
  },

  socials: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },

  currency: {
    code: "EGP",
    symbol: "EGP",
  },

  delivery: {
    baseFee: 120,
    freeDeliveryThreshold: 0,
    notes: "",
    zones: {
      cairo: 70,
      giza: 70,
      other: 120,
    },
  },

  payments: {
    cod: {
      enabled: true,
      label: "Cash on Delivery",
      instructions: "Pay when your order arrives.",
    },
    instapay: {
      enabled: true,
      label: "Instapay",
      instructions: "Send the payment then paste the transaction reference.",
    },
    vodafoneCash: {
      enabled: true,
      label: "Vodafone Cash",
      instructions: "Send the payment then paste the transaction reference.",
    },
    paymobCard: {
      enabled: false,
      label: "Visa / Mastercard",
      instructions: "Pay online using your bank card.",
    },
  },

  manualPayment: {
    instapayHandle: "01271530992",
    instapayQrImage: "",
    vodafoneCashNumber: "01097187348",
    vodafoneCashQrImage: "",
    requireTransactionReference: true,
    requireProofImage: false,
  },

  translations: {
    ar: {
      store: {
        name: "",
        address: "",
      },
      delivery: {
        notes: "",
      },
      payments: {
        cod: {
          label: "",
          instructions: "",
        },
        instapay: {
          label: "",
          instructions: "",
        },
        vodafoneCash: {
          label: "",
          instructions: "",
        },
        paymobCard: {
          label: "",
          instructions: "",
        },
      },
      manualPayment: {
        instapayLabel: "",
        instapayInstructions: "",
        vodafoneCashLabel: "",
        vodafoneCashInstructions: "",
      },
    },
  },

  tracking: {
    metaPixelId: "",
    enableMetaPixel: false,
  },

  lowStockThreshold: 5,
};

const paymentLabels = {
  cod: "Cash on Delivery",
  instapay: "Instapay",
  vodafoneCash: "Vodafone Cash",
  paymobCard: "Visa / Mastercard",
};

const paymentOrder = ["cod", "instapay", "vodafoneCash", "paymobCard"];

const cloneDefaultForm = () => {
  return JSON.parse(JSON.stringify(defaultForm));
};

const mergeSettingsIntoForm = (settings = {}) => {
  const base = cloneDefaultForm();

  return {
    ...base,

    store: {
      ...base.store,
      ...(settings.store || {}),
    },

    socials: {
      ...base.socials,
      ...(settings.socials || {}),
    },

    currency: {
      ...base.currency,
      ...(settings.currency || {}),
    },

    delivery: {
      ...base.delivery,
      ...(settings.delivery || {}),
      zones: {
        ...base.delivery.zones,
        ...(settings.delivery?.zones || {}),
      },
    },

    payments: {
      cod: {
        ...base.payments.cod,
        ...(settings.payments?.cod || {}),
      },
      instapay: {
        ...base.payments.instapay,
        ...(settings.payments?.instapay || {}),
      },
      vodafoneCash: {
        ...base.payments.vodafoneCash,
        ...(settings.payments?.vodafoneCash || {}),
      },
      paymobCard: {
        ...base.payments.paymobCard,
        ...(settings.payments?.paymobCard || {}),
      },
    },

    manualPayment: {
      ...base.manualPayment,
      ...(settings.manualPayment || {}),
    },

    translations: {
      ar: {
        store: {
          ...base.translations.ar.store,
          ...(settings.translations?.ar?.store || {}),
        },
        delivery: {
          ...base.translations.ar.delivery,
          ...(settings.translations?.ar?.delivery || {}),
        },
        payments: {
          cod: {
            ...base.translations.ar.payments.cod,
            ...(settings.translations?.ar?.payments?.cod || {}),
          },
          instapay: {
            ...base.translations.ar.payments.instapay,
            ...(settings.translations?.ar?.payments?.instapay || {}),
          },
          vodafoneCash: {
            ...base.translations.ar.payments.vodafoneCash,
            ...(settings.translations?.ar?.payments?.vodafoneCash || {}),
          },
          paymobCard: {
            ...base.translations.ar.payments.paymobCard,
            ...(settings.translations?.ar?.payments?.paymobCard || {}),
          },
        },
        manualPayment: {
          ...base.translations.ar.manualPayment,
          ...(settings.translations?.ar?.manualPayment || {}),
        },
      },
    },

    tracking: {
      ...base.tracking,
      ...(settings.tracking || {}),
    },

    lowStockThreshold:
      settings.lowStockThreshold ?? settings.lowStockThreshold === 0
        ? settings.lowStockThreshold
        : base.lowStockThreshold,
  };
};

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const [formDataOverride, setFormDataOverride] = useState(null);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });
  const [testEmailFeedback, setTestEmailFeedback] = useState({
    type: "",
    message: "",
  });
  const [testEmailToOverride, setTestEmailToOverride] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettingsRequest,
  });

  const settings = data?.settings;
  const loadedFormData = useMemo(
    () => mergeSettingsIntoForm(settings),
    [settings]
  );
  const formData = formDataOverride || loadedFormData;
  const testEmailTo =
    testEmailToOverride ??
    settings?.store?.email ??
    settings?.storeEmail ??
    "";

  const showFeedback = (type, message) => {
    setFeedback({
      type,
      message,
    });
  };

  const clearFeedback = () => {
    if (feedback.message) {
      setFeedback({
        type: "",
        message: "",
      });
    }
  };

  const updateNestedField = (section, field, value) => {
    setFormDataOverride((current) => ({
      ...(current || loadedFormData),
      [section]: {
        ...(current || loadedFormData)[section],
        [field]: value,
      },
    }));

    clearFeedback();
  };

  const updatePaymentField = (method, field, value) => {
    setFormDataOverride((current) => ({
      ...(current || loadedFormData),
      payments: {
        ...(current || loadedFormData).payments,
        [method]: {
          ...(current || loadedFormData).payments[method],
          [field]: value,
        },
      },
    }));

    clearFeedback();
  };

  const updateDeliveryZoneField = (zone, value) => {
    setFormDataOverride((current) => {
      const source = current || loadedFormData;

      return {
        ...source,
        delivery: {
          ...source.delivery,
          zones: {
            ...source.delivery.zones,
            [zone]: value,
          },
        },
      };
    });

    clearFeedback();
  };

  const updateRootField = (field, value) => {
    setFormDataOverride((current) => ({
      ...(current || loadedFormData),
      [field]: value,
    }));

    clearFeedback();
  };

  const updateArabicField = (section, field, value) => {
    setFormDataOverride((current) => {
      const source = current || loadedFormData;

      return {
        ...source,
        translations: {
          ...source.translations,
          ar: {
            ...source.translations.ar,
            [section]: {
              ...source.translations.ar[section],
              [field]: value,
            },
          },
        },
      };
    });

    clearFeedback();
  };

  const updateArabicPaymentField = (method, field, value) => {
    setFormDataOverride((current) => {
      const source = current || loadedFormData;

      return {
        ...source,
        translations: {
          ...source.translations,
          ar: {
            ...source.translations.ar,
            payments: {
              ...source.translations.ar.payments,
              [method]: {
                ...source.translations.ar.payments[method],
                [field]: value,
              },
            },
          },
        },
      };
    });

    clearFeedback();
  };

  const buildPayload = () => {
    return {
      store: {
        name: formData.store.name.trim(),
        email: formData.store.email.trim(),
        phone: formData.store.phone.trim(),
        whatsapp: formData.store.whatsapp.trim(),
        address: formData.store.address.trim(),
      },

      socials: {
        instagram: formData.socials.instagram.trim(),
        facebook: formData.socials.facebook.trim(),
        tiktok: formData.socials.tiktok.trim(),
      },

      currency: {
        code: formData.currency.code.trim() || "EGP",
        symbol: formData.currency.symbol.trim() || "EGP",
      },

      delivery: {
        baseFee: Number(formData.delivery.baseFee || 0),
        freeDeliveryThreshold: Number(
          formData.delivery.freeDeliveryThreshold || 0
        ),
        notes: formData.delivery.notes.trim(),
        zones: {
          cairo: Number(formData.delivery.zones?.cairo || 0),
          giza: Number(formData.delivery.zones?.giza || 0),
          other: Number(formData.delivery.zones?.other || 0),
        },
      },

      payments: {
        cod: {
          enabled: Boolean(formData.payments.cod.enabled),
          label: formData.payments.cod.label.trim() || "Cash on Delivery",
          instructions: formData.payments.cod.instructions.trim(),
        },
        instapay: {
          enabled: Boolean(formData.payments.instapay.enabled),
          label: formData.payments.instapay.label.trim() || "Instapay",
          instructions: formData.payments.instapay.instructions.trim(),
        },
        vodafoneCash: {
          enabled: Boolean(formData.payments.vodafoneCash.enabled),
          label:
            formData.payments.vodafoneCash.label.trim() || "Vodafone Cash",
          instructions: formData.payments.vodafoneCash.instructions.trim(),
        },
        paymobCard: {
          enabled: Boolean(formData.payments.paymobCard.enabled),
          label:
            formData.payments.paymobCard.label.trim() || "Visa / Mastercard",
          instructions: formData.payments.paymobCard.instructions.trim(),
        },
      },

      manualPayment: {
        instapayHandle: formData.manualPayment.instapayHandle.trim(),
        instapayQrImage: formData.manualPayment.instapayQrImage.trim(),
        vodafoneCashNumber:
          formData.manualPayment.vodafoneCashNumber.trim(),
        vodafoneCashQrImage:
          formData.manualPayment.vodafoneCashQrImage.trim(),
        requireTransactionReference: Boolean(
          formData.manualPayment.requireTransactionReference
        ),
        requireProofImage: Boolean(
          formData.manualPayment.requireProofImage
        ),
      },

      translations: {
        ar: {
          store: {
            name: formData.translations.ar.store.name.trim(),
            address: formData.translations.ar.store.address.trim(),
          },
          delivery: {
            notes: formData.translations.ar.delivery.notes.trim(),
          },
          payments: Object.fromEntries(
            paymentOrder.map((method) => [
              method,
              {
                label:
                  formData.translations.ar.payments[method].label.trim(),
                instructions:
                  formData.translations.ar.payments[
                    method
                  ].instructions.trim(),
              },
            ])
          ),
          manualPayment: {
            instapayLabel:
              formData.translations.ar.manualPayment.instapayLabel.trim(),
            instapayInstructions:
              formData.translations.ar.manualPayment.instapayInstructions.trim(),
            vodafoneCashLabel:
              formData.translations.ar.manualPayment.vodafoneCashLabel.trim(),
            vodafoneCashInstructions:
              formData.translations.ar.manualPayment.vodafoneCashInstructions.trim(),
          },
        },
      },

      tracking: {
        metaPixelId: formData.tracking.metaPixelId.trim(),
        enableMetaPixel: Boolean(formData.tracking.enableMetaPixel),
      },

      lowStockThreshold: Number(formData.lowStockThreshold || 0),
    };
  };

  const updateSettingsMutation = useMutation({
    mutationFn: updateAdminSettingsRequest,
    onSuccess: (response) => {
      if (response?.settings) {
        setFormDataOverride(mergeSettingsIntoForm(response.settings));
      }

      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });

      showFeedback(
        "success",
        response?.message || "Settings updated successfully."
      );
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to update settings."
      );
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: sendAdminTestEmailRequest,
    onSuccess: (response) => {
      if (response?.success) {
        setTestEmailFeedback({
          type: "success",
          message: response.message || "Test email sent successfully.",
        });
        showFeedback(
          "success",
          response.message || "Test email sent successfully."
        );
        return;
      }

      setTestEmailFeedback({
        type: response?.skipped ? "warning" : "error",
        message:
          response?.message ||
          "Test email could not be sent. Check SMTP settings.",
      });
      showFeedback(
        "error",
        response?.message ||
          "Test email could not be sent. Check SMTP settings."
      );
    },
    onError: (err) => {
      setTestEmailFeedback({
        type: "error",
        message:
          err?.friendlyMessage ||
          err?.message ||
          "Test email could not be sent.",
      });
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Test email could not be sent."
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.store.name) {
      showFeedback("error", "Store name is required.");
      return;
    }

    if (payload.store.email && !/^\S+@\S+\.\S+$/.test(payload.store.email)) {
      showFeedback("error", "Store email is invalid.");
      return;
    }

    if (payload.lowStockThreshold < 0) {
      showFeedback("error", "Low stock threshold cannot be negative.");
      return;
    }

    updateSettingsMutation.mutate(payload);
  };

  const handleTestEmail = () => {
    setTestEmailFeedback({
      type: "",
      message: "",
    });

    testEmailMutation.mutate({
      to: testEmailTo.trim() || undefined,
    });
  };

  const isSaving = updateSettingsMutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Settings"
        description="Control store info, payment methods, delivery fees, tracking IDs, low-stock alerts, and test email notifications."
        className="pt-0"
      />

      {isLoading && (
        <Card>
          <p className="text-sm text-white/45">Loading settings...</p>
        </Card>
      )}

      {isError && (
        <Card>
          <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error?.friendlyMessage ||
              error?.message ||
              "Failed to load settings."}
          </div>
        </Card>
      )}

      {!isLoading && !isError && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {feedback.message && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : "border-red-300/25 bg-red-400/10 text-red-100"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <Card>
                <SectionLabel>Store</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Store Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Store Name"
                    value={formData.store.name}
                    onChange={(event) =>
                      updateNestedField("store", "name", event.target.value)
                    }
                    placeholder="Davinto"
                  />

                  <Input
                    label="Store Email"
                    type="email"
                    value={formData.store.email}
                    onChange={(event) =>
                      updateNestedField("store", "email", event.target.value)
                    }
                    placeholder="info@davinto.com"
                  />

                  <Input
                    label="Phone"
                    value={formData.store.phone}
                    onChange={(event) =>
                      updateNestedField("store", "phone", event.target.value)
                    }
                    placeholder="011..."
                  />

                  <Input
                    label="WhatsApp"
                    value={formData.store.whatsapp}
                    onChange={(event) =>
                      updateNestedField(
                        "store",
                        "whatsapp",
                        event.target.value
                      )
                    }
                    placeholder="011..."
                  />

                  <div className="md:col-span-2">
                    <Textarea
                      label="Address"
                      value={formData.store.address}
                      onChange={(event) =>
                        updateNestedField(
                          "store",
                          "address",
                          event.target.value
                        )
                      }
                      placeholder="Store address..."
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <SectionLabel>Socials</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Social Links
                </h2>

                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="Instagram"
                    value={formData.socials.instagram}
                    onChange={(event) =>
                      updateNestedField(
                        "socials",
                        "instagram",
                        event.target.value
                      )
                    }
                    placeholder="https://instagram.com/..."
                  />

                  <Input
                    label="Facebook"
                    value={formData.socials.facebook}
                    onChange={(event) =>
                      updateNestedField(
                        "socials",
                        "facebook",
                        event.target.value
                      )
                    }
                    placeholder="https://facebook.com/..."
                  />

                  <Input
                    label="TikTok"
                    value={formData.socials.tiktok}
                    onChange={(event) =>
                      updateNestedField(
                        "socials",
                        "tiktok",
                        event.target.value
                      )
                    }
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
              </Card>

              <Card>
                <SectionLabel>Delivery</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Delivery Rules
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Base Delivery Fee"
                    type="number"
                    min="0"
                    value={formData.delivery.baseFee}
                    onChange={(event) =>
                      updateNestedField(
                        "delivery",
                        "baseFee",
                        event.target.value
                      )
                    }
                    placeholder="85"
                  />

                  <Input
                    label="Free Delivery Threshold"
                    type="number"
                    min="0"
                    value={formData.delivery.freeDeliveryThreshold}
                    onChange={(event) =>
                      updateNestedField(
                        "delivery",
                        "freeDeliveryThreshold",
                        event.target.value
                      )
                    }
                    placeholder="0 = disabled"
                  />

                  <Input
                    label="Cairo Fee"
                    type="number"
                    min="0"
                    value={formData.delivery.zones?.cairo}
                    onChange={(event) =>
                      updateDeliveryZoneField("cairo", event.target.value)
                    }
                    placeholder="70"
                  />

                  <Input
                    label="Giza Fee"
                    type="number"
                    min="0"
                    value={formData.delivery.zones?.giza}
                    onChange={(event) =>
                      updateDeliveryZoneField("giza", event.target.value)
                    }
                    placeholder="70"
                  />

                  <Input
                    label="Other Areas Fee"
                    type="number"
                    min="0"
                    value={formData.delivery.zones?.other}
                    onChange={(event) =>
                      updateDeliveryZoneField("other", event.target.value)
                    }
                    placeholder="120"
                  />

                  <div className="md:col-span-2">
                    <Textarea
                      label="Delivery Notes"
                      value={formData.delivery.notes}
                      onChange={(event) =>
                        updateNestedField(
                          "delivery",
                          "notes",
                          event.target.value
                        )
                      }
                      placeholder="Delivery usually takes 3-5 business days..."
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <SectionLabel>Payments</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Payment Methods
                </h2>

                <div className="space-y-5">
                  {paymentOrder.map((method) => (
                    <div
                      key={method}
                      className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"
                    >
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                            {paymentLabels[method]}
                          </p>

                          <h3 className="mt-2 text-xl font-black uppercase">
                            {formData.payments[method].label}
                          </h3>
                        </div>

                        <label className="flex items-center gap-3 rounded-full border border-white/10 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={formData.payments[method].enabled}
                            onChange={(event) =>
                              updatePaymentField(
                                method,
                                "enabled",
                                event.target.checked
                              )
                            }
                          />

                          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">
                            Enabled
                          </span>
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Display Label"
                          value={formData.payments[method].label}
                          onChange={(event) =>
                            updatePaymentField(
                              method,
                              "label",
                              event.target.value
                            )
                          }
                          placeholder={paymentLabels[method]}
                        />

                        <Textarea
                          label="Instructions"
                          value={formData.payments[method].instructions}
                          onChange={(event) =>
                            updatePaymentField(
                              method,
                              "instructions",
                              event.target.value
                            )
                          }
                          placeholder="Payment instructions shown in checkout..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionLabel>Manual Payments</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Instapay / Vodafone Cash
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Instapay Handle"
                    value={formData.manualPayment.instapayHandle}
                    onChange={(event) =>
                      updateNestedField(
                        "manualPayment",
                        "instapayHandle",
                        event.target.value
                      )
                    }
                    placeholder="name@instapay"
                  />

                  <Input
                    label="Instapay QR Image URL"
                    value={formData.manualPayment.instapayQrImage}
                    onChange={(event) =>
                      updateNestedField(
                        "manualPayment",
                        "instapayQrImage",
                        event.target.value
                      )
                    }
                    placeholder="Optional QR image URL"
                  />

                  <Input
                    label="Vodafone Cash Number"
                    value={formData.manualPayment.vodafoneCashNumber}
                    onChange={(event) =>
                      updateNestedField(
                        "manualPayment",
                        "vodafoneCashNumber",
                        event.target.value
                      )
                    }
                    placeholder="010..."
                  />

                  <Input
                    label="Vodafone Cash QR Image URL"
                    value={formData.manualPayment.vodafoneCashQrImage}
                    onChange={(event) =>
                      updateNestedField(
                        "manualPayment",
                        "vodafoneCashQrImage",
                        event.target.value
                      )
                    }
                    placeholder="Optional QR image URL"
                  />

                  <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        formData.manualPayment.requireTransactionReference
                      }
                      onChange={(event) =>
                        updateNestedField(
                          "manualPayment",
                          "requireTransactionReference",
                          event.target.checked
                        )
                      }
                    />

                    <span className="text-sm font-bold text-white/65">
                      Require transaction reference for manual payments
                    </span>
                  </label>
                </div>
              </Card>

              <Card>
                <SectionLabel>Arabic Content</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Arabic Store & Delivery
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Arabic Store Name"
                    dir="rtl"
                    value={formData.translations.ar.store.name}
                    onChange={(event) =>
                      updateArabicField("store", "name", event.target.value)
                    }
                    placeholder="دافينتو"
                  />

                  <Textarea
                    label="Arabic Store Address"
                    dir="rtl"
                    value={formData.translations.ar.store.address}
                    onChange={(event) =>
                      updateArabicField("store", "address", event.target.value)
                    }
                    placeholder="عنوان المتجر..."
                  />

                  <div className="md:col-span-2">
                    <Textarea
                      label="Arabic Delivery Notes"
                      dir="rtl"
                      value={formData.translations.ar.delivery.notes}
                      onChange={(event) =>
                        updateArabicField(
                          "delivery",
                          "notes",
                          event.target.value
                        )
                      }
                      placeholder="ملاحظات التوصيل..."
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <SectionLabel>Arabic Payments</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Arabic Payment Labels & Instructions
                </h2>

                <div className="space-y-5">
                  {paymentOrder.map((method) => (
                    <div
                      key={`arabic-${method}`}
                      className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"
                    >
                      <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/35">
                        {paymentLabels[method]}
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Arabic Display Label"
                          dir="rtl"
                          value={
                            formData.translations.ar.payments[method].label
                          }
                          onChange={(event) =>
                            updateArabicPaymentField(
                              method,
                              "label",
                              event.target.value
                            )
                          }
                          placeholder="اسم طريقة الدفع بالعربية"
                        />

                        <Textarea
                          label="Arabic Instructions"
                          dir="rtl"
                          value={
                            formData.translations.ar.payments[method]
                              .instructions
                          }
                          onChange={(event) =>
                            updateArabicPaymentField(
                              method,
                              "instructions",
                              event.target.value
                            )
                          }
                          placeholder="تعليمات الدفع بالعربية..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionLabel>Arabic Manual Payments</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Arabic Manual Payment Instructions
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Arabic Instapay Detail Label"
                    dir="rtl"
                    value={
                      formData.translations.ar.manualPayment.instapayLabel
                    }
                    onChange={(event) =>
                      updateArabicField(
                        "manualPayment",
                        "instapayLabel",
                        event.target.value
                      )
                    }
                    placeholder="بيانات إنستاباي"
                  />

                  <Textarea
                    label="Arabic Instapay Detail Instructions"
                    dir="rtl"
                    value={
                      formData.translations.ar.manualPayment
                        .instapayInstructions
                    }
                    onChange={(event) =>
                      updateArabicField(
                        "manualPayment",
                        "instapayInstructions",
                        event.target.value
                      )
                    }
                    placeholder="تعليمات إنستاباي..."
                  />

                  <Input
                    label="Arabic Vodafone Cash Detail Label"
                    dir="rtl"
                    value={
                      formData.translations.ar.manualPayment
                        .vodafoneCashLabel
                    }
                    onChange={(event) =>
                      updateArabicField(
                        "manualPayment",
                        "vodafoneCashLabel",
                        event.target.value
                      )
                    }
                    placeholder="بيانات فودافون كاش"
                  />

                  <Textarea
                    label="Arabic Vodafone Cash Detail Instructions"
                    dir="rtl"
                    value={
                      formData.translations.ar.manualPayment
                        .vodafoneCashInstructions
                    }
                    onChange={(event) =>
                      updateArabicField(
                        "manualPayment",
                        "vodafoneCashInstructions",
                        event.target.value
                      )
                    }
                    placeholder="تعليمات فودافون كاش..."
                  />
                </div>
              </Card>
            </div>

            <div className="space-y-6 xl:sticky xl:top-28">
              <Card>
                <SectionLabel>Email</SectionLabel>

                <h2 className="mb-4 text-2xl font-black uppercase">
                  Test Email
                </h2>

                <p className="mb-5 text-sm leading-7 text-white/50">
                  This tests the SMTP settings from the server `.env`. If SMTP
                  is empty, this will show a safe warning instead of crashing.
                </p>

                <Input
                  label="Send Test To"
                  type="email"
                  value={testEmailTo}
                  onChange={(event) =>
                    setTestEmailToOverride(event.target.value)
                  }
                  placeholder="owner@email.com"
                />

                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={handleTestEmail}
                  disabled={testEmailMutation.isPending}
                >
                  {testEmailMutation.isPending
                    ? "Sending Test..."
                    : "Send Test Email"}
                </Button>

                {testEmailFeedback.message && (
                  <div
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                      testEmailFeedback.type === "success"
                        ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                        : testEmailFeedback.type === "warning"
                          ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
                          : "border-red-300/25 bg-red-400/10 text-red-100"
                    }`}
                  >
                    {testEmailFeedback.message}
                  </div>
                )}

                <p className="mt-4 text-xs leading-6 text-white/35">
                  New order emails are sent automatically after an order is
                  created. Email failure never blocks checkout.
                </p>
              </Card>

              <Card>
                <SectionLabel>Tracking</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Pixel / Analytics
                </h2>

                <Input
                  label="Meta Pixel ID"
                  value={formData.tracking.metaPixelId}
                  onChange={(event) =>
                    updateNestedField(
                      "tracking",
                      "metaPixelId",
                      event.target.value
                    )
                  }
                  placeholder="Pixel ID"
                />

                <p className="mt-4 text-xs leading-6 text-white/35">
                  Frontend pixel uses `VITE_META_PIXEL_ID` from client `.env`.
                  This field is stored for admin reference and future server-side
                  tracking.
                </p>
              </Card>

              <Card>
                <SectionLabel>Inventory</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Stock Alerts
                </h2>

                <Input
                  label="Low Stock Threshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(event) =>
                    updateRootField("lowStockThreshold", event.target.value)
                  }
                  placeholder="5"
                />

                <p className="mt-4 text-xs leading-6 text-white/35">
                  Products at or below this stock count appear in dashboard low
                  stock alerts.
                </p>
              </Card>

              <Card>
                <SectionLabel>Currency</SectionLabel>

                <h2 className="mb-6 text-2xl font-black uppercase">
                  Store Currency
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Code"
                    value={formData.currency.code}
                    onChange={(event) =>
                      updateNestedField(
                        "currency",
                        "code",
                        event.target.value
                      )
                    }
                    placeholder="EGP"
                  />

                  <Input
                    label="Symbol"
                    value={formData.currency.symbol}
                    onChange={(event) =>
                      updateNestedField(
                        "currency",
                        "symbol",
                        event.target.value
                      )
                    }
                    placeholder="EGP"
                  />
                </div>
              </Card>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Saving Settings..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
