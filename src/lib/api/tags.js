import { fetchApi } from "./client";

export const getTags = async (ownerIdQuery = "") => {
  const params = new URLSearchParams();
  if (ownerIdQuery) params.set("ownerIdQuery", ownerIdQuery);
  const suffix = params.toString();
  return fetchApi(`/tags${suffix ? `?${suffix}` : ""}`);
};

export const createTag = async (name, color, ownerIdQuery = "") => {
  const params = new URLSearchParams();
  if (ownerIdQuery) params.set("ownerIdQuery", ownerIdQuery);
  const suffix = params.toString();
  return fetchApi(`/tags${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
};

export const deleteTag = async (tagId) => {
  return fetchApi(`/tags/${tagId}`, {
    method: "DELETE",
  });
};
