"use client";

import { useActionState } from "react";
import { submitContact, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          Name *
        </label>
        <input id="name" name="name" required className="w-full rounded-md border px-3 py-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="w-full rounded-md border px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="subject">
          Subject
        </label>
        <input id="subject" name="subject" className="w-full rounded-md border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="message">
          Message
        </label>
        <textarea id="message" name="message" rows={5} className="w-full rounded-md border px-3 py-2" />
      </div>

      {state.status !== "idle" && (
        <p className={state.status === "success" ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
