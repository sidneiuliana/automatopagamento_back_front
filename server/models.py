from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy import Column, Float, Integer, String, Boolean
from datetime import datetime
from sqlalchemy import create_engine, func
import uuid

Base = declarative_base()

class DBStatusCheck(Base):
    __tablename__ = "status_checks"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_name = Column(String(255), index=True)
    timestamp = Column(DATETIME(fsp=6), default=datetime.utcnow)

class DBProduct(Base):
    __tablename__ = "products"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    purchase_value = Column(Float)
    value = Column(Float)
    stock = Column(Integer, default=0)
    printed_quantity = Column(Integer, default=0)
    qr_code_data = Column(String(255), nullable=True)
    qr_code_image = Column(String(2000), nullable=True)
    status = Column(String, default="active")
    created_at = Column(DATETIME(fsp=6), default=datetime.utcnow)
    updated_at = Column(DATETIME(fsp=6), default=datetime.utcnow, onupdate=datetime.utcnow)

class DBTicket(Base):
    __tablename__ = "tickets"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(255), index=True)
    product_name = Column(String(255))
    product_purchase_value = Column(Float)
    product_value = Column(Float)
    ticket_number = Column(String(255), default=lambda: str(uuid.uuid4())[:8], unique=True)
    quantity = Column(Integer, default=1)
    is_redeemed = Column(Boolean, default=False)
    created_at = Column(DATETIME(fsp=6), default=datetime.utcnow)
    redeemed_at = Column(DATETIME(fsp=6), nullable=True)

class DBPixTransaction(Base):
    __tablename__ = "pix_transactions"
    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4())) # Assumindo um ID único para cada transação
    pagador = Column(String(255), index=True)
    data_transferencia = Column(DATETIME(fsp=6), default=datetime.utcnow)
    destinatario = Column(String(255), index=True)
    valor = Column(Float)