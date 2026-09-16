"use server";

import { publicPost } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";

export interface ApplyFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function submitApplication(
  _prevState: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "Name is required." };
  }

  const slug = await getTenantSlug();
  try {
    await publicPost(slug, "/applications", {
      name,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
      share_type: formData.get("share_type") || null,
      pan: formData.get("pan") || null,
      nid: formData.get("nid") || null,
      extra: {
        bank_name: formData.get("bank_name") || undefined,
        preferred_district: formData.get("preferred_district") || undefined,
        membership_type: formData.get("membership_type") || undefined,
      },
    });
    return {
      status: "success",
      message: "Your application has been submitted. Our team will review it and reach out.",
    };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
