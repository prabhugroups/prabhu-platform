"""Import every module's models so Base.metadata is complete for Alembic
autogenerate and for create_all() in tests. Import order matters only in that
FK-referenced tables (tenants, admin_users, shareholders, locations_*) must be
importable before the modules that reference them — SQLAlchemy resolves
string-based ForeignKey targets lazily via the shared metadata, so plain
import-for-side-effect is sufficient regardless of order.
"""

from app.db.session import Base  # noqa: F401
from app.modules.tenants.models import Tenant, TenantDomain  # noqa: F401
from app.modules.auth.models import AdminUser  # noqa: F401
from app.modules.nav.models import NavItem  # noqa: F401
from app.modules.settings.models import ContentSetting  # noqa: F401
from app.modules.teams.models import TeamMember  # noqa: F401
from app.modules.documents.models import Document  # noqa: F401
from app.modules.faqs.models import Faq  # noqa: F401
from app.modules.gallery.models import Gallery, GalleryImage  # noqa: F401
from app.modules.portfolio.models import Portfolio  # noqa: F401
from app.modules.popup.models import Popup  # noqa: F401
from app.modules.banner.models import Banner  # noqa: F401
from app.modules.home_content.models import (  # noqa: F401
    Associate,
    HomeContent,
    Spokesperson,
    Stakeholder,
)
from app.modules.tenant_contact.models import TenantContact  # noqa: F401
from app.modules.about_page.models import AboutPage  # noqa: F401
from app.modules.page_seo.models import PageSeo  # noqa: F401
from app.modules.contacts.models import Contact  # noqa: F401
from app.modules.applications.models import Application  # noqa: F401
from app.modules.locations.models import Province, District, Municipality  # noqa: F401
from app.modules.shareholders.models import (  # noqa: F401
    Shareholder,
    ShareholderCitizenshipInfo,
    ShareholderNationalIdInfo,
    ShareholderAddress,
    ShareholderNominee,
    ShareholderBankInfo,
)
