import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SequenceProductChoice {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
}

/** Every non-archived product, so a sequence can target any of them. */
export async function GET() {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  try {
    await dbConnect();
    const products = await Product.find({ status: { $ne: "ARCHIVED" } })
      .sort({ title: 1 })
      .select("_id title slug type status")
      .lean()
      .exec();

    const choices: SequenceProductChoice[] = products.map((p) => ({
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      type: p.type,
      status: p.status,
    }));

    return apiOk({ choices });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
