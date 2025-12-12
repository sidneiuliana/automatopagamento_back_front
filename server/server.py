from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from fastapi import Depends, FastAPI, APIRouter, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
import qrcode
from io import BytesIO
import base64

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, DBTicket, DBProduct, DBStatusCheck

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL connection
##DATABASE_URL = "mysql+pymysql://root:Sepultura%40123@localhost/product_management"
###DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:Sepultura%40123@localhost/product_management")
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://sidneiuliana:Sepultura%4012@ulianaedemarchi.mysql.uhserver.com/ulianaedemarchi")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency to get the DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models


# Create tables
Base.metadata.create_all(bind=engine)

# Utility function to generate QR code
def generate_qr_code(product_data: DBProduct) -> str:
    """Generate QR code for product and return base64 encoded image"""
    ##qr_data = f"Product: {product_data.name}\nID: {product_data.product_id}\nValue: ${product_data.value}"
    qr_data = f"Product: {product_data.name}\nID: {product_data.product_id}\nPurchase Value: ${product_data.purchase_value}\nValue: ${product_data.value}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


# Define Pydantic Models for API (unchanged, but now map to SQLAlchemy models)


class Ticket(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_purchase_value: float = 0.0
    product_value: float
    ticket_number: str
    quantity: int
    is_redeemed: bool
    created_at: datetime
    redeemed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class TicketCreate(BaseModel):
    product_id: str
    quantity: int = 1

class TicketRedeem(BaseModel):
    ticket_id: str

    model_config = ConfigDict(from_attributes=True)

class StatusCheckCreate(BaseModel):
    client_name: str

class StatusCheck(BaseModel):
    id: str
    client_name: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class Product(BaseModel):
    id: str
    product_id: str
    name: str
    purchase_value: float = 0.0
    value: float
    stock: int
    printed_quantity: int
    qr_code_data: Optional[str]
    qr_code_image: Optional[str]
    status: str = "active"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str
    purchase_value: float = 0.0
    value: float
    stock: int = 0
    printed_quantity: int = 0
    status: str = "active"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    purchase_value: Optional[float] = None
    value: Optional[float] = None
    stock: Optional[int] = None
    printed_quantity: Optional[int] = None
    status: Optional[str] = None



# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

from fastapi import Depends

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(status_check: StatusCheckCreate, db: Session = Depends(get_db)):
    """Create a new status check entry"""
    db_status_check = DBStatusCheck(
        client_name=status_check.client_name,
        timestamp=datetime.utcnow()
    )
    db.add(db_status_check)
    db.commit()
    db.refresh(db_status_check)
    return db_status_check

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(db: Session = Depends(get_db)):
    status_checks = db.query(DBStatusCheck).all()
    return status_checks

# Product Endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product with QR code"""
    
    # Generate a unique product_id
    new_product_id = str(uuid.uuid4())
    
    # Create product object
    db_product = DBProduct(
        product_id=new_product_id,
        name=product_data.name,
        purchase_value=product_data.purchase_value,
        value=product_data.value,
        stock=product_data.stock,
        printed_quantity=product_data.printed_quantity,
        status=product_data.status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Generate QR code
    ##qr_data = f"Product: {db_product.name}\nID: {db_product.product_id}\nValue: ${db_product.value}"
    qr_data = f"Product: {db_product.name}\nID: {db_product.product_id}\nPurchase Value: ${db_product.purchase_value}\nValue: ${db_product.value}"
    qr_image = generate_qr_code(db_product)
    
    # Update product with QR code data
    db_product.qr_code_data = qr_data
    db_product.qr_code_image = qr_image
    
    # Insert into database
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@api_router.get("/products", response_model=List[Product])
async def get_products(db: Session = Depends(get_db)):
    """Get all products"""
    products = db.query(DBProduct).limit(1000).all()
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a specific product"""
    product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_update: ProductUpdate, db: Session = Depends(get_db)):
    """Update an existing product"""
    db_product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    qr_code_needs_update = False
    for key, value in update_data.items():
        if hasattr(db_product, key):
            setattr(db_product, key, value)
            if key in ['name', 'purchase_value', 'value']:
                qr_code_needs_update = True

    if qr_code_needs_update:
        db_product.qr_code_data = f"Product: {db_product.name}\nID: {db_product.product_id}\nPurchase Value: ${db_product.purchase_value}\nValue: ${db_product.value}"
        db_product.qr_code_image = generate_qr_code(db_product)
    
    db_product.updated_at = datetime.utcnow()
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Update product fields in associated tickets if changed
    updates = {}
    if 'name' in update_data and update_data['name'] is not None:
        updates["product_name"] = db_product.name
    if 'value' in update_data and update_data['value'] is not None:
        updates["product_value"] = db_product.value
    if 'purchase_value' in update_data and update_data['purchase_value'] is not None:
        updates["product_purchase_value"] = db_product.purchase_value
        
    if updates:
        db.query(DBTicket).filter(DBTicket.product_id == db_product.product_id).update(updates)
        db.commit()
    
    return db_product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: Session = Depends(get_db)):
    """Delete a product"""
    db_product = db.query(DBProduct).filter(DBProduct.product_id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"message": f"Product {product_id} deleted successfully"}



# Ticket Endpoints
@api_router.post("/tickets", response_model=List[Ticket])
async def create_tickets(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    """Create tickets for a product"""
    
    # Get product details
    product = db.query(DBProduct).filter(DBProduct.product_id == ticket_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status == 'inactive':
        raise HTTPException(status_code=400, detail="Cannot create tickets for an inactive product.")
    
    # Check if there is enough stock to print the tickets
    if ticket_data.quantity > product.stock:
        raise HTTPException(status_code=400, detail="Not enough stock to create the requested number of tickets.")
    
    
    tickets = []
    for _ in range(ticket_data.quantity):
        db_ticket = DBTicket(
            product_id=product.product_id,
            product_name=product.name,
            product_purchase_value=product.purchase_value if product.purchase_value is not None else 0.0,
            product_value=product.value
        )
        db.add(db_ticket)
        tickets.append(db_ticket)
    
    product.stock -= ticket_data.quantity 
    product.printed_quantity += ticket_data.quantity # Increment printed_quantity 
    db.add(product) 
    db.commit() 
    for ticket in tickets: 
        db.refresh(ticket) 
    db.refresh(product) 
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.get("/tickets", response_model=List[Ticket])
async def get_tickets(db: Session = Depends(get_db)):
    """Get all unredeemed tickets"""
    tickets = db.query(DBTicket).filter(DBTicket.is_redeemed == False, DBTicket.redeemed_at == None).limit(1000).all()
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    """Get a specific ticket by ticket_id"""
    ticket = db.query(DBTicket).filter(DBTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return Ticket(**ticket.__dict__)

@api_router.get("/tickets/product/{product_id}", response_model=List[Ticket])
async def get_tickets_by_product(product_id: str, db: Session = Depends(get_db)):
    """Get tickets for a specific product"""
    tickets = db.query(DBTicket).filter(DBTicket.product_id == product_id).all()
    return [Ticket(**ticket.__dict__) for ticket in tickets]

@api_router.post("/tickets/redeem", response_model=Ticket)
async def redeem_ticket(ticket_redeem: TicketRedeem, db: Session = Depends(get_db)):
    """Redeem a ticket"""
    ticket = db.query(DBTicket).filter(DBTicket.id == ticket_redeem.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.is_redeemed:
        raise HTTPException(status_code=400, detail="Ticket already redeemed")
    
    ticket.is_redeemed = True 
    ticket.redeemed_at = datetime.utcnow() 
    db.add(ticket) 
    db.commit() 
    db.refresh(ticket) 
 
    # Decrement printed_quantity for the associated product 
    product = db.query(DBProduct).filter(DBProduct.product_id == ticket.product_id).first() 
    if product: 
        product.printed_quantity -= 1 
        db.add(product) 
        db.commit() 
        db.refresh(product) 
 
    return Ticket(**ticket.__dict__)
    





# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
