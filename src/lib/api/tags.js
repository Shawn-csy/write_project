import { fetchApi } from "./client";

export const getTags = async () => fetchApi("/tags");

export const createTag = async (name, color) => {
  return fetchApi("/tags", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
};

export const deleteTag = async (tagId) => {
  return fetchApi(`/tags/${tagId}`, {
    method: "DELETE",
  });
};
