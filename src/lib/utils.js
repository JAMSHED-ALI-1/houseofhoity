export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
