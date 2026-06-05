const SECRET_ENV_SUFFIX = /(?:_KEY|_TOKEN|_SECRET)$/i;
const SECRET_ASSIGNMENT = /\b([A-Z][A-Z0-9_]*(?:_KEY|_TOKEN|_SECRET))(\s*[:=]\s*)(["']?)([^"',;\s]+)/gi;
const BEARER_TOKEN = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi;

function marker(name) {
  return `«REDACTED:${String(name).toUpperCase()}»`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function envSecrets() {
  return Object.entries(process.env)
    .filter(([name, value]) => SECRET_ENV_SUFFIX.test(name) && value)
    .sort((a, b) => String(b[1]).length - String(a[1]).length);
}

function redact(input) {
  let output = String(input ?? "");

  for (const [name, value] of envSecrets()) {
    output = output.replace(new RegExp(escapeRegExp(value), "g"), marker(name));
  }

  output = output.replace(BEARER_TOKEN, `$1${marker("BEARER_TOKEN")}`);
  output = output.replace(SECRET_ASSIGNMENT, (_match, name, separator, quote) => `${name}${separator}${quote}${marker(name)}${quote}`);

  return output;
}

export function redactForLog(str) {
  return redact(str);
}

export function redactForSpec(str) {
  return redact(str);
}
