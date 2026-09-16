import enum
from decimal import Decimal
from typing import Optional

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.mixins import TimestampMixin
from app.db.session import Base


class AddressType(str, enum.Enum):
    permanent = "permanent"
    contact = "contact"


class Shareholder(Base, TimestampMixin):
    """Full statutory shareholder registry — only used by tenants with
    `tenants.shareholder_module_enabled = true`. Direct port of the schema
    already proven across 4 of the 7 legacy tenants (real Nepali-securities
    registrar domain data: demat accounts, share certificates, nominees)."""

    __tablename__ = "shareholders"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_np: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    father_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    grandfather_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    spouse_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shareholder_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    share_certificate_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    share_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    share_signature: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    agency: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    share_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    share_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True
    )

    citizenship_info: Mapped[Optional["ShareholderCitizenshipInfo"]] = relationship(
        back_populates="shareholder", cascade="all, delete-orphan", uselist=False
    )
    national_id_info: Mapped[Optional["ShareholderNationalIdInfo"]] = relationship(
        back_populates="shareholder", cascade="all, delete-orphan", uselist=False
    )
    addresses: Mapped[list["ShareholderAddress"]] = relationship(
        back_populates="shareholder", cascade="all, delete-orphan"
    )
    nominees: Mapped[list["ShareholderNominee"]] = relationship(
        back_populates="shareholder", cascade="all, delete-orphan"
    )
    bank_info: Mapped[Optional["ShareholderBankInfo"]] = relationship(
        back_populates="shareholder", cascade="all, delete-orphan", uselist=False
    )


class ShareholderCitizenshipInfo(Base):
    __tablename__ = "shareholder_citizenship_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    shareholder_id: Mapped[int] = mapped_column(
        ForeignKey("shareholders.id", ondelete="CASCADE"), unique=True
    )
    citizenship_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    issued_district: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    issued_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    shareholder: Mapped["Shareholder"] = relationship(back_populates="citizenship_info")


class ShareholderNationalIdInfo(Base):
    __tablename__ = "shareholder_national_id_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    shareholder_id: Mapped[int] = mapped_column(
        ForeignKey("shareholders.id", ondelete="CASCADE"), unique=True
    )
    national_id_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    shareholder: Mapped["Shareholder"] = relationship(back_populates="national_id_info")


class ShareholderAddress(Base):
    __tablename__ = "shareholder_addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    shareholder_id: Mapped[int] = mapped_column(
        ForeignKey("shareholders.id", ondelete="CASCADE"), index=True
    )
    address_type: Mapped[AddressType] = mapped_column(Enum(AddressType))
    province_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("locations_provinces.id"), nullable=True
    )
    district_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("locations_districts.id"), nullable=True
    )
    municipality_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("locations_municipalities.id"), nullable=True
    )
    ward: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    shareholder: Mapped["Shareholder"] = relationship(back_populates="addresses")


class ShareholderNominee(Base):
    __tablename__ = "shareholder_nominees"

    id: Mapped[int] = mapped_column(primary_key=True)
    shareholder_id: Mapped[int] = mapped_column(
        ForeignKey("shareholders.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    relation: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    citizenship_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    shareholder: Mapped["Shareholder"] = relationship(back_populates="nominees")


class ShareholderBankInfo(Base):
    __tablename__ = "shareholder_bank_info"

    id: Mapped[int] = mapped_column(primary_key=True)
    shareholder_id: Mapped[int] = mapped_column(
        ForeignKey("shareholders.id", ondelete="CASCADE"), unique=True
    )
    demat_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    branch_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    shareholder: Mapped["Shareholder"] = relationship(back_populates="bank_info")
