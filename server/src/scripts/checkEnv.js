require("dotenv").config();

const groups = [
  {
    title: "Core Server",
    required: ["PORT", "NODE_ENV", "JWT_SECRET", "CLIENT_URL"],
    optional: [],
  },
  {
    title: "Database",
    required: ["MONGO_URI"],
    optional: [],
  },
  {
    title: "Customer Authentication",
    required: [],
    optional: [
      "CUSTOMER_ACCESS_TOKEN_SECRET",
      "CUSTOMER_REFRESH_TOKEN_SECRET",
      "CUSTOMER_ACCESS_TOKEN_EXPIRES_IN",
      "CUSTOMER_REFRESH_TOKEN_EXPIRES_IN",
    ],
  },
  {
    title: "Rate Limiting",
    required: [],
    optional: [
      "RATE_LIMIT_WINDOW_MS",
      "AUTH_RATE_LIMIT_MAX",
      "REFRESH_RATE_LIMIT_MAX",
      "TRACKING_RATE_LIMIT_MAX",
      "ORDER_CREATE_RATE_LIMIT_MAX",
      "PAYMENT_RETRY_RATE_LIMIT_MAX",
    ],
  },
  {
    title: "Initial Admin",
    required: ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"],
    optional: [],
  },
  {
    title: "Cloudinary",
    required: [],
    optional: [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "CLOUDINARY_UPLOAD_FOLDER",
    ],
  },
  {
    title: "Email / SMTP",
    required: [],
    optional: [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_SECURE",
      "EMAIL_FROM",
      "ADMIN_ORDER_EMAIL",
    ],
  },
  {
    title: "Paymob",
    required: [],
    optional: [
      "PAYMOB_API_KEY",
      "PAYMOB_INTEGRATION_ID",
      "PAYMOB_IFRAME_ID",
      "PAYMOB_HMAC_SECRET",
      "PAYMOB_BASE_URL",
      "PAYMOB_CURRENCY",
    ],
  },
];

const isFilled = (key) => {
  return Boolean(String(process.env[key] || "").trim());
};

const printKey = (key, required = false) => {
  const filled = isFilled(key);
  const icon = filled ? "✅" : required ? "❌" : "⚠️ ";
  const label = required ? "required" : "optional";

  console.log(`${icon} ${key} (${label})`);
};

console.log("");
console.log("Davinto Environment Check");
console.log("=========================");
console.log("");

let missingRequired = [];

groups.forEach((group) => {
  console.log(group.title);
  console.log("-".repeat(group.title.length));

  group.required.forEach((key) => {
    printKey(key, true);

    if (!isFilled(key)) {
      missingRequired.push(key);
    }
  });

  group.optional.forEach((key) => {
    printKey(key, false);
  });

  console.log("");
});

const missingDedicatedCustomerSecrets = [
  "CUSTOMER_ACCESS_TOKEN_SECRET",
  "CUSTOMER_REFRESH_TOKEN_SECRET",
].filter((key) => !isFilled(key));

if (
  String(process.env.NODE_ENV || "").trim() === "production" &&
  missingDedicatedCustomerSecrets.length > 0
) {
  console.log("Customer Authentication Warning");
  console.log("-------------------------------");
  console.log(
    "Dedicated customer token secrets are missing in production. Customer auth endpoints will refuse to issue or verify tokens until these are configured:"
  );
  console.log(
    missingDedicatedCustomerSecrets.map((key) => `- ${key}`).join("\n")
  );
  console.log("");
} else if (
  missingDedicatedCustomerSecrets.length > 0 &&
  isFilled("JWT_SECRET") &&
  String(process.env.NODE_ENV || "development").trim() === "development"
) {
  console.log(
    "Customer auth development note: missing dedicated customer secrets will fall back to JWT_SECRET in development only."
  );
  console.log("");
}

if (missingRequired.length > 0) {
  console.log("Missing required variables:");
  console.log(missingRequired.map((key) => `- ${key}`).join("\n"));
  console.log("");
  console.log("Status: Not ready for real database/deployment yet.");
  process.exitCode = 1;
} else {
  console.log("Status: Core environment looks ready.");
}

console.log("");
