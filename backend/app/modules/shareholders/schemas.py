from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.modules.shareholders.models import AddressType


class CitizenshipInfoIn(BaseModel):
    citizenship_number: Optional[str] = None
    issued_district: Optional[str] = None
    issued_date: Optional[str] = None
    file: Optional[str] = None


class NationalIdInfoIn(BaseModel):
    national_id_number: Optional[str] = None
    file: Optional[str] = None


class BankInfoIn(BaseModel):
    demat_number: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_number: Optional[str] = None


class AddressIn(BaseModel):
    address_type: AddressType
    province_id: Optional[int] = None
    district_id: Optional[int] = None
    municipality_id: Optional[int] = None
    ward: Optional[str] = None
    street: Optional[str] = None


class NomineeIn(BaseModel):
    name: str
    relation: Optional[str] = None
    citizenship_number: Optional[str] = None


class ShareholderCreate(BaseModel):
    serial_number: Optional[str] = None
    name_en: str
    name_np: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    pan: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    spouse_name: Optional[str] = None
    shareholder_number: Optional[str] = None
    share_certificate_number: Optional[str] = None
    share_photo: Optional[str] = None
    share_signature: Optional[str] = None
    agency: Optional[str] = None
    share_number: Optional[str] = None
    share_amount: Optional[Decimal] = None

    citizenship_info: Optional[CitizenshipInfoIn] = None
    national_id_info: Optional[NationalIdInfoIn] = None
    bank_info: Optional[BankInfoIn] = None
    addresses: list[AddressIn] = []
    nominees: list[NomineeIn] = []


class ShareholderUpdate(ShareholderCreate):
    name_en: Optional[str] = None  # type: ignore[assignment]


class CitizenshipInfoOut(CitizenshipInfoIn):
    model_config = {"from_attributes": True}


class NationalIdInfoOut(NationalIdInfoIn):
    model_config = {"from_attributes": True}


class BankInfoOut(BankInfoIn):
    model_config = {"from_attributes": True}


class AddressOut(AddressIn):
    id: int
    model_config = {"from_attributes": True}


class NomineeOut(NomineeIn):
    id: int
    model_config = {"from_attributes": True}


class ShareholderOut(BaseModel):
    id: int
    serial_number: Optional[str]
    name_en: str
    name_np: Optional[str]
    email: Optional[str]
    mobile: Optional[str]
    pan: Optional[str]
    father_name: Optional[str]
    grandfather_name: Optional[str]
    spouse_name: Optional[str]
    shareholder_number: Optional[str]
    share_certificate_number: Optional[str]
    share_photo: Optional[str]
    share_signature: Optional[str]
    agency: Optional[str]
    share_number: Optional[str]
    share_amount: Optional[Decimal]
    citizenship_info: Optional[CitizenshipInfoOut]
    national_id_info: Optional[NationalIdInfoOut]
    bank_info: Optional[BankInfoOut]
    addresses: list[AddressOut] = []
    nominees: list[NomineeOut] = []

    model_config = {"from_attributes": True}
