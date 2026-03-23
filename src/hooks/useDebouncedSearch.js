import { useState, useEffect } from "react";

/**
 * useDebouncedSearch
 *
 * 將搜尋字串去抖後回傳，避免每次輸入都觸發過濾或 API。
 *
 * @param {string} value  - 即時輸入值
 * @param {number} delay  - 去抖延遲毫秒（預設 250ms）
 * @returns {string}      - 去抖後的值
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearch = useDebouncedSearch(searchTerm, 200);
 * // 用 debouncedSearch 做過濾或 API 呼叫
 */
export function useDebouncedSearch(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
