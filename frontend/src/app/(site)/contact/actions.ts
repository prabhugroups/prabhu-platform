"use server";

import { publicPost } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "Name is required." };
  }

  const slug = await getTenantSlug();
  try {
    await publicPost(slug, "/contacts", {
      name,
      phone: formData.get("phone") || null,
      email: formData.get("email") || null,
      subject: formData.get("subject") || null,
      message: formData.get("message") || null,
    });
    return { status: "success", message: "Thank you — we'll be in touch shortly." };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
