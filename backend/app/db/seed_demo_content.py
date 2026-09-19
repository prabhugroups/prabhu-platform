"""Optional demo-content seeder: populates one tenant's public-site content
(banners, about text, stakeholders, associates, spokesperson, contact info,
portfolios, team, documents, two gallery albums) from a small, curated,
real-world-derived fixture — so any dev checking out this repo can see a
fully populated tenant site immediately, instead of the blank pages the
base `python -m app.db.seed` leaves (that script only creates the 7 tenant
rows + locations + super admin; it intentionally seeds no public content,
since real per-tenant content is meant to come from the CMS).

The fixture under seed_data/demo_content/<slug>/content.json is real
text (titles, about copy, contact info, etc.) captured once from that
tenant's real production site — but every image and document is a plain
placeholder generated on the fly at seed time (Pillow for images, a
hand-rolled minimal PDF for documents), never a real photo or file. Ported
content.json is replayed as fresh rows against whichever tenant you point
it at, not necessarily the tenant it was captured from.

Idempotent per target tenant: skips (with a message) if that tenant
already has a home_content row, so re-running is harmless.

Run with (from backend/, venv active):
    python -m app.db.seed_demo_content                    # seeds prabhu-holdings
    python -m app.db.seed_demo_content --tenant prabhusteels
"""

import argparse
import io
import json
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db import base_all  # noqa: F401 — registers all models on Base.metadata

FIXTURE_SLUG = "prabhu-holdings"  # the tenant this fixture's text content was captured from
SEED_DATA_DIR = Path(__file__).parent / "seed_data" / "demo_content" / FIXTURE_SLUG

# (width, height, background RGB) per module — just enough variety that a
# seeded admin table doesn't look like one repeated image.
_IMAGE_SPECS = {
    "banner": (1280, 720, (198, 216, 236)),
    "stakeholders": (400, 400, (222, 235, 222)),
    "associates": (400, 400, (222, 235, 222)),
    "spokesperson": (400, 400, (230, 230, 230)),
    "portfolios": (800, 600, (214, 229, 214)),
    "teams": (400, 400, (230, 230, 230)),
    "settings": (800, 600, (214, 224, 236)),
    "gallery": (800, 600, (225, 225, 225)),
}


def _placeholder_image_bytes(module: str, label: str = "Sample Image") -> bytes:
    width, height, bg = _IMAGE_SPECS.get(module, (800, 600, (225, 225, 225)))
    img = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(img)
    border = tuple(max(0, c - 40) for c in bg)
    draw.rectangle([8, 8, width - 9, height - 9], outline=border, width=4)
    font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - text_w) / 2, (height - text_h) / 2), label, fill=border, font=font)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=80)
    return buf.getvalue()


def _placeholder_pdf_bytes(label: str = "Sample Document") -> bytes:
    """Hand-rolled minimal single-page PDF — no reportlab/fpdf dependency
    needed for a one-line placeholder page. `label` must be ASCII (Helvetica
    base-14 can't render other scripts); real document titles can contain
    non-ASCII text since that's stored as the row's title, not drawn here."""
    esc = label.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    content = f"BT /F1 16 Tf 72 700 Td ({esc}) Tj ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> "
        "/MediaBox [0 0 612 792] /Contents 4 0 R >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = "%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n"
    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        pdf += f"{off:010d} 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF"
    return pdf.encode("latin-1")


def write_placeholder(tenant_slug: str, module: str, kind: str, label: str = "") -> str:
    """Generates a placeholder image or PDF and writes it under
    uploads/<tenant>/<module>/<new-uuid>.ext, mirroring the naming
    convention app/modules/media/service.py uses for real uploads. Returns
    the relative path to store on the row."""
    dest_dir = Path("uploads") / tenant_slug / module
    dest_dir.mkdir(parents=True, exist_ok=True)
    if kind == "pdf":
        data, ext = _placeholder_pdf_bytes(label or "Sample Document"), ".pdf"
    else:
        data, ext = _placeholder_image_bytes(module, label or "Sample Image"), ".webp"
    filename = f"{uuid.uuid4().hex}{ext}"
    (dest_dir / filename).write_bytes(data)
    return f"{tenant_slug}/{module}/{filename}"


def seed(db: Session, tenant_slug: str) -> None:
    with open(SEED_DATA_DIR / "content.json", encoding="utf-8") as f:
        data = json.load(f)

    tenant_id = db.execute(text("SELECT id FROM tenants WHERE slug=:s"), {"s": tenant_slug}).scalar()
    if tenant_id is None:
        raise SystemExit(f"No tenant with slug '{tenant_slug}' — run `python -m app.db.seed` first.")

    existing = db.execute(text("SELECT id FROM home_content WHERE tenant_id=:t"), {"t": tenant_id}).first()
    if existing:
        print(f"Tenant '{tenant_slug}' already has home_content — skipping (already seeded).")
        return

    for i, b in enumerate(data["banners"]):
        path = write_placeholder(tenant_slug, "banner", "image", "Sample Banner")
        db.execute(
            text("INSERT INTO banners (tenant_id, title, link, file, sort_order) VALUES (:t, :title, :link, :file, :so)"),
            {"t": tenant_id, "title": b["title"], "link": b["link"], "file": path, "so": i},
        )

    about = data["about"]
    if about:
        db.execute(
            text(
                "INSERT INTO home_content (tenant_id, about_content, highlighted_content) "
                "VALUES (:t, :about, :highlighted)"
            ),
            {"t": tenant_id, "about": about["about_content"], "highlighted": about["highlighted_content"]},
        )

    for i, s in enumerate(data["stakeholders"]):
        path = write_placeholder(tenant_slug, "stakeholders", "image", "Sample Logo")
        db.execute(
            text("INSERT INTO stakeholders (tenant_id, logo_file, link, sort_order) VALUES (:t, :file, :link, :so)"),
            {"t": tenant_id, "file": path, "link": s["link"], "so": i},
        )

    for i, a in enumerate(data["associates"]):
        path = write_placeholder(tenant_slug, "associates", "image", "Sample Logo")
        db.execute(
            text("INSERT INTO associates (tenant_id, logo_file, link, sort_order) VALUES (:t, :file, :link, :so)"),
            {"t": tenant_id, "file": path, "link": a["link"], "so": i},
        )

    sp = data.get("spokesperson")
    if sp:
        path = write_placeholder(tenant_slug, "spokesperson", "image", "Sample Photo")
        db.execute(
            text(
                "INSERT INTO spokespersons (tenant_id, name, role, phone, email, image, `show`) "
                "VALUES (:t, :name, :role, :phone, :email, :image, :show)"
            ),
            {
                "t": tenant_id, "name": sp["name"], "role": sp["role"], "phone": sp["phone"],
                "email": sp["email"], "image": path, "show": sp["show"],
            },
        )

    contact = data.get("contact")
    if contact:
        path = write_placeholder(tenant_slug, "settings", "image", "Sample Map")
        db.execute(
            text(
                "INSERT INTO tenant_contacts (tenant_id, phone_primary, phone_secondary, email, location, "
                "opening_hours, whatsapp_number, registered_office, branch_office, copyright_text, map_file, "
                "facebook_url, instagram_url, youtube_url) "
                "VALUES (:t, :phone_primary, :phone_secondary, :email, :location, :opening_hours, "
                ":whatsapp_number, :registered_office, :branch_office, :copyright_text, :map_file, "
                ":facebook_url, :instagram_url, :youtube_url)"
            ),
            {
                "t": tenant_id,
                "phone_primary": contact["phone_primary"],
                "phone_secondary": contact["phone_secondary"],
                "email": contact["email"],
                "location": contact["location"],
                "opening_hours": contact["opening_hours"],
                "whatsapp_number": contact["whatsapp_number"],
                "registered_office": contact["registered_office"],
                "branch_office": contact["branch_office"],
                "copyright_text": contact["copyright_text"],
                "map_file": path,
                "facebook_url": contact["facebook_url"],
                "instagram_url": contact["instagram_url"],
                "youtube_url": contact["youtube_url"],
            },
        )

    for i, p in enumerate(data["portfolios"]):
        path = write_placeholder(tenant_slug, "portfolios", "image", "Sample Image")
        db.execute(
            text("INSERT INTO portfolios (tenant_id, title, type, file, sort_order) VALUES (:t, :title, :type, :file, :so)"),
            {"t": tenant_id, "title": p["title"], "type": p["type"], "file": path, "so": i},
        )

    for i, m in enumerate(data["teams"]):
        path = write_placeholder(tenant_slug, "teams", "image", "Sample Photo")
        db.execute(
            text(
                "INSERT INTO teams (tenant_id, type, image, name, role, company_name, sort_order) "
                "VALUES (:t, :type, :image, :name, :role, :company_name, :so)"
            ),
            {
                "t": tenant_id, "type": m["type"], "image": path, "name": m["name"],
                "role": m["role"], "company_name": m["company_name"], "so": i,
            },
        )

    for d in data["documents"]:
        path = write_placeholder(tenant_slug, "documents", "pdf", "Sample Document")
        db.execute(
            text("INSERT INTO documents (tenant_id, title, file, type, date) VALUES (:t, :title, :file, :type, :date)"),
            {"t": tenant_id, "title": d["title"], "file": path, "type": d["type"], "date": d["date"]},
        )

    for g in data["galleries"]:
        result = db.execute(
            text("INSERT INTO galleries (tenant_id, title, date) VALUES (:t, :title, :date)"),
            {"t": tenant_id, "title": g["title"], "date": g["date"]},
        )
        gallery_id = result.lastrowid
        for img in g["images"]:
            path = write_placeholder(tenant_slug, "gallery", "image", "Sample Photo")
            db.execute(
                text("INSERT INTO gallery_images (gallery_id, type, file) VALUES (:g, :type, :file)"),
                {"g": gallery_id, "type": img["type"], "file": path},
            )

    db.commit()
    print(
        f"Seeded demo content for '{tenant_slug}': "
        f"{len(data['banners'])} banners, {len(data['stakeholders'])} stakeholders, "
        f"{len(data['associates'])} associates, {'1' if sp else '0'} spokesperson, "
        f"{'1' if contact else '0'} contact info, {len(data['portfolios'])} portfolios, "
        f"{len(data['teams'])} team members, {len(data['documents'])} documents, "
        f"{len(data['galleries'])} gallery album(s). "
        f"All images/documents are generated placeholders, not real files."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--tenant", default=FIXTURE_SLUG,
        help=f"Target tenant slug to seed into (default: {FIXTURE_SLUG}, the tenant this fixture's text was captured from)",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed(db, args.tenant)
    finally:
        db.close()


if __name__ == "__main__":
    main()
