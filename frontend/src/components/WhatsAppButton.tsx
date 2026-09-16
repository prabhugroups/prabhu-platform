import { MessageCircle } from "lucide-react";

/** Floating mobile-only WhatsApp button — ported from prabhucablecar-web's
 * (pages)/layout.tsx. No client interactivity needed, just a conditional
 * link. */
export function WhatsAppButton({ whatsappNumber }: { whatsappNumber: string | null }) {
  if (!whatsappNumber) return null;

  return (
    <div className="md:hidden">
      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-green-500 p-2 text-white shadow-lg transition-all hover:bg-green-600"
      >
        <MessageCircle size={32} className="shadow-lg" />
      </a>
    </div>
  );
}
