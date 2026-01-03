from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from bson import ObjectId
from datetime import datetime


class PyObjectId(str):
    """Custom ObjectId type for Pydantic."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            return v
        raise ValueError("Invalid ObjectId")


class RowType(str, Enum):
    SATKER = "SATKER"
    PROGRAM = "PROGRAM"
    ACTIVITY = "ACTIVITY"  # Klasifikasi Rincian Output
    KRO = "KRO"    # Rincian Output
    RO = "RO"
    COMPONENT = "COMPONENT"
    SUBCOMPONENT = "SUBCOMPONENT"
    ACCOUNT = "ACCOUNT"
    DETAIL = "DETAIL"
    UNIT = "UNIT"
    PAYMENT_MECHANISM = 'PAYMENT_MECHANISM'


class ChangeStatus(str, Enum):
    UNCHANGED = "UNCHANGED"
    CHANGED = "CHANGED"
    NEW = "NEW"
    DELETED = "DELETED"
    BLOCKED = "BLOCKED"


class BudgetDetail(BaseModel):
    volume: float
    unit: str
    price: float
    total: float


class MonthlyDetail(BaseModel):
    rpd: float = 0  # Rencana Penarikan Dana / Jumlah Realisasi
    realization: float = 0  # Jumlah akan Realisasi
    spm: str = ""  # No. SPM
    date: str = ""  # Tanggal Pelaksanaan
    isVerified: bool = False  # Ceklis
    sp2d: float = 0  # Realisasi SP2D


class BudgetRowBase(BaseModel):
    code: str
    description: str
    type: RowType
    semula: Optional[BudgetDetail] = None
    menjadi: Optional[BudgetDetail] = None
    monthlyAllocation: Dict[str, MonthlyDetail] = {}
    isBlocked: Optional[bool] = None
    isOpen: Optional[bool] = True


class BudgetRowCreate(BudgetRowBase):
    children: List["BudgetRowCreate"] = []


class BudgetRowUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    type: Optional[RowType] = None
    semula: Optional[BudgetDetail] = None
    menjadi: Optional[BudgetDetail] = None
    monthlyAllocation: Optional[Dict[str, MonthlyDetail]] = None
    isBlocked: Optional[bool] = None
    isOpen: Optional[bool] = None


class BudgetRow(BudgetRowBase):
    id: str = Field(alias="_id")
    children: List["BudgetRow"] = []

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# MongoDB document model (includes parent reference for hierarchical structure)
class BudgetRowDocument(BudgetRowBase):
    id: str = Field(alias="_id")
    parent_id: Optional[str] = None
    order: int = 0  # For maintaining order within siblings

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Master Data Models
class MasterDataItem(BaseModel):
    code: str
    desc: str


class MasterDataCreate(BaseModel):
    type: RowType
    code: str
    desc: str


class MasterDataDocument(BaseModel):
    id: str = Field(alias="_id")
    type: RowType
    code: str
    desc: str

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Theme Configuration
class ThemeConfig(BaseModel):
    UNCHANGED: str = "#ffffff"
    CHANGED: str = "#fed7aa"  # orange-200
    NEW: str = "#a5f3fc"      # cyan-200
    DELETED: str = "#ef4444"  # red-500
    BLOCKED: str = "#d8b4fe"  # purple-300


class ThemeConfigDocument(BaseModel):
    id: str = Field(alias="_id")
    user_id: str = "default"
    config: ThemeConfig

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Response Models
class BudgetRowResponse(BaseModel):
    id: str
    code: str
    description: str
    type: RowType
    semula: Optional[BudgetDetail] = None
    menjadi: Optional[BudgetDetail] = None
    monthlyAllocation: Dict[str, MonthlyDetail] = {}
    isBlocked: Optional[bool] = None
    isOpen: Optional[bool] = True
    children: List["BudgetRowResponse"] = []


class MasterDataResponse(BaseModel):
    type: RowType
    items: List[MasterDataItem]

class RevisionBase(BaseModel):
    note: str
    timestamp: datetime = Field(default_factory=datetime.now)

class RevisionCreate(RevisionBase):
    data: List[BudgetRowResponse] # Menyimpan seluruh tree anggaran

class RevisionResponse(RevisionBase):
    id: str
    # Kita tidak mengembalikan 'data' saat listing agar ringan
    
class RevisionDetailResponse(RevisionResponse):
    data: List[BudgetRowResponse]


# Fix forward references
BudgetRowCreate.model_rebuild()
BudgetRow.model_rebuild()
BudgetRowResponse.model_rebuild()
