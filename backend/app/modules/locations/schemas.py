from pydantic import BaseModel


class ProvinceOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class DistrictOut(BaseModel):
    id: int
    province_id: int
    name: str

    model_config = {"from_attributes": True}


class MunicipalityOut(BaseModel):
    id: int
    district_id: int
    name: str

    model_config = {"from_attributes": True}
