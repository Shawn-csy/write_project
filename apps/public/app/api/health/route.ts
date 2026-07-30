import { readinessResponse } from "@/lib/serviceHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  return readinessResponse();
}
