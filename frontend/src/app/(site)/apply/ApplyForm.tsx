"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = { status: "idle" };

/** `full`: Gen-2 shareholder-KYC tenants (apply-membership) — extra fields.
 * `simple`: Gen-1 tenants (request-share) — just the core intake fields.
 * Both post to the same generic /applications intake endpoint; the fuller
 * registrar workflow (citizenship, bank/demat, nominees) happens later in
 * the admin CMS once staff convert an approved application into a
 * full shareholder record. */
export function ApplyForm({ variant }: { variant: "full" | "simple" }) {
  const [state, formAction, pending] = useActionState(submitApplication, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="name" label="Full Name *" required />
        <Field id="phone" label="Phone" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="email" label="Email" type="email" />
        <Field id="share_type" label="Share Type" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="pan" label="PAN Number" />
        <Field id="nid" label="National ID Number" />
      </div>

      {variant === "full" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="bank_name" label="Bank Name" />
          <Field id="preferred_district" label="Preferred District" />
          <Field id="membership_type" label="Membership Type" />
        </div>
      )}

      {state.status !== "idle" && (
        <p className={state.status === "success" ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={id} type={type} required={required} className="w-full rounded-md border px-3 py-2" />
    </div>
  );
}
