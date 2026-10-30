import { fetchApi } from "./client";
import type {
  PublicDemoSubmissionListResponse,
  PublicDemoSubmissionRecord,
  StudioDemoSubmissionPayload,
  StudioDemoSubmissionUpdatePayload,
} from "../../types/api";

const path = "/my-demo-submissions";

export const getMyDemoSubmissions = (): Promise<PublicDemoSubmissionListResponse> =>
  fetchApi<PublicDemoSubmissionListResponse>(path, { cache: "no-store" });

export const createMyDemoSubmission = (payload: StudioDemoSubmissionPayload): Promise<PublicDemoSubmissionRecord> =>
  fetchApi<PublicDemoSubmissionRecord>(path, { method: "POST", body: JSON.stringify(payload) });

export const updateMyDemoSubmission = (id: string, payload: StudioDemoSubmissionUpdatePayload): Promise<PublicDemoSubmissionRecord> =>
  fetchApi<PublicDemoSubmissionRecord>(`${path}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteMyDemoSubmission = (id: string): Promise<{ success: boolean }> =>
  fetchApi<{ success: boolean }>(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" });
