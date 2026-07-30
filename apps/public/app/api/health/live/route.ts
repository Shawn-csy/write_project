import { livenessResponse } from "@/lib/serviceHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  return livenessResponse();
}
