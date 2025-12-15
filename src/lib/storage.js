export const readString = (key, allowedValues = []) => {
  try {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined) return null;
    if (Array.isArray(allowedValues) && allowedValues.length > 0 && !allowedValues.includes(val)) {
      return null;
    }
    return val;
  } catch (err) {
    console.warn("讀取字串設定失敗", key, err);
    return null;
  }
};

export const readNumber = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  } catch (err) {
    console.warn("讀取數字設定失敗", key, err);
    return null;
  }
};

export const writeValue = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch (err) {
    console.warn("寫入設定失敗", key, err);
  }
};
