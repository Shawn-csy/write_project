import { fetchApi } from "./client";
import type { ScriptMutationResponse, TagApi } from "../../types/api";

export const getTags = async (ownerIdQuery = ""): Promise<TagApi[]> => {
  const params = new URLSearchParams();
  if (ownerIdQuery) params.set("ownerIdQuery", ownerIdQuery);
  const suffix = params.toString();
  return fetchApi(`/tags${suffix ? `?${suffix}` : ""}`) as Promise<TagApi[]>;
};

export const createTag = async (name: string, color: string, ownerIdQuery = ""): Promise<TagApi> => {
  const params = new URLSearchParams();
  if (ownerIdQuery) params.set("ownerIdQuery", ownerIdQuery);
  const suffix = params.toString();
  return fetchApi(`/tags${suffix ? `?${suffix}` : ""}`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  }) as Promise<TagApi>;
};

export const deleteTag = async (tagId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/tags/${tagId}`, {
    method: "DELETE",
  }) as Promise<ScriptMutationResponse>;
};
