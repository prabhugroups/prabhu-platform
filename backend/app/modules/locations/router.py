from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.locations.models import District, Municipality, Province
from app.modules.locations.schemas import DistrictOut, MunicipalityOut, ProvinceOut

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/provinces", response_model=list[ProvinceOut])
def list_provinces(db: Session = Depends(get_db)):
    return db.query(Province).order_by(Province.name).all()


@router.get("/districts", response_model=list[DistrictOut])
def list_districts(province_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(District)
    if province_id:
        q = q.filter(District.province_id == province_id)
    return q.order_by(District.name).all()


@router.get("/municipalities", response_model=list[MunicipalityOut])
def list_municipalities(district_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Municipality)
    if district_id:
        q = q.filter(Municipality.district_id == district_id)
    return q.order_by(Municipality.name).all()
