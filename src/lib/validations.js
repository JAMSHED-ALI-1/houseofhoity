export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function validateRequiredFields(values, fields) {
  return fields.reduce((errors, field) => {
    if (!isRequired(values[field])) {
      return { ...errors, [field]: "This field is required" };
    }

    return errors;
  }, {});
}
