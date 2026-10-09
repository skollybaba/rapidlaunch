import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { listProfitReports, getProfitReportForMonth, saveProfitReport, ProfitReportInput } from "@/lib/services/profit-service";
import { apiOk, apiError, handleApiError, newRequestId } from "@/lib/api";
import { ProfitReportSchema } from "@/types/profit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return apiError(401, "UNAUTHORIZED", "Admin access required", requestId);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month) {
      const calc = await getProfitReportForMonth(month);
      return apiOk(calc);
    }

    const reports = await listProfitReports(24);
    return apiOk(reports);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return apiError(401, "UNAUTHORIZED", "Admin access required", requestId);
    }

    const body = await request.json();
    const parsed = ProfitReportSchema.parse(body);
    const calc = await saveProfitReport(parsed);
    return apiOk(calc);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}