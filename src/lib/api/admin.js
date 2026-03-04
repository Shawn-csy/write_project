import { fetchApi } from "./client";

export const searchUsers = async (query) => {
  return fetchApi(`/admin/users?q=${encodeURIComponent(query)}`);
};
