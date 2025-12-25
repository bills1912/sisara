"""
Migration Script for SISARA Budget System
This script initializes the MongoDB database with initial data from the frontend.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from bson import ObjectId

# MongoDB connection settings
MONGODB_URL = "mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DATABASE_NAME = "budget_system"


# Initial Budget Data (from data.ts)
INITIAL_BUDGET_DATA = [
    {
        "id": "1",
        "code": "054.01.GG",
        "description": "Program Penyediaan dan Pelayanan Informasi Statistik",
        "type": "PROGRAM",
        "semula": None,
        "menjadi": None,
        "monthlyAllocation": {},
        "isOpen": True,
        "children": [
            {
                "id": "1-1",
                "code": "2896",
                "description": "Pengembangan dan Analisis Statistik",
                "type": "KRO",
                "semula": None,
                "menjadi": None,
                "monthlyAllocation": {},
                "isOpen": True,
                "children": [
                    {
                        "id": "1-1-1",
                        "code": "2896.BMA",
                        "description": "Data dan Informasi Publik [Base Line]",
                        "type": "RO",
                        "semula": {"volume": 1, "unit": "Layanan", "price": 2000000, "total": 2000000},
                        "menjadi": {"volume": 1, "unit": "Layanan", "price": 2000000, "total": 2000000},
                        "monthlyAllocation": {},
                        "isOpen": True,
                        "children": [
                            {
                                "id": "1-1-1-1",
                                "code": "2896.BMA.004",
                                "description": "PUBLIKASI/LAPORAN ANALISIS DAN PENGEMBANGAN STATISTIK",
                                "type": "COMPONENT",
                                "semula": {"volume": 1, "unit": "Layanan", "price": 2000000, "total": 2000000},
                                "menjadi": {"volume": 1, "unit": "Layanan", "price": 2000000, "total": 2000000},
                                "monthlyAllocation": {
                                    "0": {"rpd": 500000, "realization": 0, "spm": "", "date": "", "isVerified": False, "sp2d": 0},
                                    "5": {"rpd": 1500000, "realization": 0, "spm": "", "date": "", "isVerified": False, "sp2d": 0}
                                },
                                "isOpen": True,
                                "children": [
                                    {
                                        "id": "1-1-1-1-1",
                                        "code": "051",
                                        "description": "PERSIAPAN",
                                        "type": "SUBCOMPONENT",
                                        "semula": None,
                                        "menjadi": None,
                                        "monthlyAllocation": {},
                                        "isOpen": True,
                                        "children": [
                                            {
                                                "id": "1-1-1-1-1-1",
                                                "code": "521811",
                                                "description": "Belanja Barang Persediaan Barang Konsumsi (KPPN.007-Gunung Sitoli)",
                                                "type": "ITEM",
                                                "semula": {"volume": 1, "unit": "PAKET", "price": 1490000, "total": 1490000},
                                                "menjadi": {"volume": 1, "unit": "PAKET", "price": 1490000, "total": 1490000},
                                                "monthlyAllocation": {},
                                                "children": []
                                            }
                                        ]
                                    },
                                    {
                                        "id": "1-1-1-1-2",
                                        "code": "052",
                                        "description": "PENGUMPULAN DATA",
                                        "type": "SUBCOMPONENT",
                                        "semula": None,
                                        "menjadi": None,
                                        "monthlyAllocation": {},
                                        "isOpen": True,
                                        "children": [
                                            {
                                                "id": "1-1-1-1-2-1",
                                                "code": "524113",
                                                "description": "Belanja Perjalanan Dinas Dalam Kota",
                                                "type": "ITEM",
                                                "semula": {"volume": 5, "unit": "O-K", "price": 102000, "total": 510000},
                                                "menjadi": {"volume": 5, "unit": "O-K", "price": 102000, "total": 510000},
                                                "monthlyAllocation": {},
                                                "children": [
                                                    {
                                                        "id": "1-1-1-1-2-1-1",
                                                        "code": "-",
                                                        "description": "Transport lokal pengumpulan data KDA",
                                                        "type": "ITEM",
                                                        "semula": {"volume": 5, "unit": "O-K", "price": 102000, "total": 510000},
                                                        "menjadi": {"volume": 5, "unit": "O-K", "price": 102000, "total": 510000},
                                                        "monthlyAllocation": {},
                                                        "children": []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
]


# Initial Master Data (from App.tsx)
INITIAL_MASTER_DATA = {
    "KRO": [
        {"code": "2896", "desc": "Pengembangan dan Analisis Statistik"},
        {"code": "2897", "desc": "Penyediaan Layanan Statistik"}
    ],
    "RO": [
        {"code": "2896.BMA", "desc": "Data dan Informasi Publik [Base Line]"},
        {"code": "2896.QIA", "desc": "Layanan Dukungan Manajemen"}
    ],
    "COMPONENT": [
        {"code": "001", "desc": "Gaji dan Tunjangan"},
        {"code": "002", "desc": "Operasional Kantor"},
        {"code": "004", "desc": "PUBLIKASI/LAPORAN ANALISIS DAN PENGEMBANGAN STATISTIK"}
    ],
    "SUBCOMPONENT": [
        {"code": "051", "desc": "PERSIAPAN"},
        {"code": "052", "desc": "PENGUMPULAN DATA"},
        {"code": "053", "desc": "PENGOLAHAN DATA"}
    ],
    "HEADER_ACCOUNT": [
        {"code": "A", "desc": "TANPA SUB KOMPONEN"},
        {"code": "B", "desc": "BELANJA OPERASIONAL"}
    ],
    "ITEM": [
        {"code": "521211", "desc": "Belanja Bahan"},
        {"code": "524111", "desc": "Belanja Perjalanan Dinas Biasa"},
        {"code": "521811", "desc": "Belanja Barang Persediaan Barang Konsumsi"}
    ]
}


# Default Theme Configuration
DEFAULT_THEME = {
    "UNCHANGED": "#ffffff",
    "CHANGED": "#fed7aa",
    "NEW": "#a5f3fc",
    "DELETED": "#ef4444",
    "BLOCKED": "#d8b4fe"
}


async def flatten_budget_data(data: list, parent_id: str = None) -> list:
    """
    Flatten hierarchical budget data for MongoDB storage.
    Converts tree structure to flat list with parent_id references.
    """
    documents = []
    
    for order, item in enumerate(data):
        doc = {
            "_id": item["id"],
            "code": item["code"],
            "description": item["description"],
            "type": item["type"],
            "semula": item.get("semula"),
            "menjadi": item.get("menjadi"),
            "monthlyAllocation": item.get("monthlyAllocation", {}),
            "isBlocked": item.get("isBlocked"),
            "isOpen": item.get("isOpen", True),
            "parent_id": parent_id,
            "order": order
        }
        documents.append(doc)
        
        # Process children recursively
        if item.get("children"):
            child_docs = await flatten_budget_data(item["children"], item["id"])
            documents.extend(child_docs)
    
    return documents


async def migrate():
    """Run the migration."""
    print("🚀 Starting SISARA Database Migration...")
    print(f"📡 Connecting to MongoDB: {DATABASE_NAME}")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
    db = client[DATABASE_NAME]
    
    try:
        # Test connection
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Clear existing data (optional - for fresh migration)
        print("\n🗑️  Clearing existing collections...")
        await db.budget_rows.delete_many({})
        await db.master_data.delete_many({})
        await db.theme_configs.delete_many({})
        print("   ✓ Collections cleared")
        
        # Migrate Budget Data
        print("\n📊 Migrating Budget Data...")
        budget_docs = await flatten_budget_data(INITIAL_BUDGET_DATA)
        if budget_docs:
            result = await db.budget_rows.insert_many(budget_docs)
            print(f"   ✓ Inserted {len(result.inserted_ids)} budget rows")
        
        # Create indexes for budget_rows
        await db.budget_rows.create_index("parent_id")
        await db.budget_rows.create_index("type")
        await db.budget_rows.create_index("code")
        print("   ✓ Created indexes for budget_rows")
        
        # Migrate Master Data
        print("\n📋 Migrating Master Data...")
        master_docs = []
        for type_key, items in INITIAL_MASTER_DATA.items():
            for item in items:
                master_docs.append({
                    "_id": str(ObjectId()),
                    "type": type_key,
                    "code": item["code"],
                    "desc": item["desc"]
                })
        
        if master_docs:
            result = await db.master_data.insert_many(master_docs)
            print(f"   ✓ Inserted {len(result.inserted_ids)} master data items")
        
        # Create indexes for master_data
        await db.master_data.create_index("type")
        await db.master_data.create_index([("type", 1), ("code", 1)], unique=True)
        print("   ✓ Created indexes for master_data")
        
        # Migrate Theme Configuration
        print("\n🎨 Migrating Theme Configuration...")
        theme_doc = {
            "_id": str(ObjectId()),
            "user_id": "default",
            "config": DEFAULT_THEME
        }
        await db.theme_configs.insert_one(theme_doc)
        print("   ✓ Inserted default theme configuration")
        
        # Create index for theme_configs
        await db.theme_configs.create_index("user_id", unique=True)
        print("   ✓ Created index for theme_configs")
        
        # Verify migration
        print("\n✅ Migration Summary:")
        budget_count = await db.budget_rows.count_documents({})
        master_count = await db.master_data.count_documents({})
        theme_count = await db.theme_configs.count_documents({})
        
        print(f"   • Budget Rows: {budget_count}")
        print(f"   • Master Data Items: {master_count}")
        print(f"   • Theme Configs: {theme_count}")
        
        print("\n🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise e
    
    finally:
        client.close()
        print("🔌 Database connection closed.")


async def rollback():
    """Rollback migration (delete all data)."""
    print("⚠️  Starting Migration Rollback...")
    
    client = AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
    db = client[DATABASE_NAME]
    
    try:
        await client.admin.command('ping')
        print("✅ Connected to MongoDB")
        
        # Drop collections
        await db.budget_rows.drop()
        await db.master_data.drop()
        await db.theme_configs.drop()
        
        print("✅ All collections dropped successfully")
        
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        raise e
    
    finally:
        client.close()
        print("🔌 Database connection closed.")


async def verify():
    """Verify current database state."""
    print("🔍 Verifying Database State...")
    
    client = AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
    db = client[DATABASE_NAME]
    
    try:
        await client.admin.command('ping')
        print("✅ Connected to MongoDB")
        
        # Get collection stats
        collections = await db.list_collection_names()
        print(f"\n📦 Collections in database '{DATABASE_NAME}':")
        
        for coll_name in collections:
            count = await db[coll_name].count_documents({})
            print(f"   • {coll_name}: {count} documents")
        
        # Sample data from each collection
        print("\n📄 Sample Data:")
        
        # Budget rows
        budget_sample = await db.budget_rows.find_one({"parent_id": None})
        if budget_sample:
            print(f"\n   Budget Row (root): {budget_sample.get('code')} - {budget_sample.get('description')[:50]}...")
        
        # Master data by type
        for type_key in ["KRO", "RO", "COMPONENT"]:
            sample = await db.master_data.find_one({"type": type_key})
            if sample:
                print(f"   Master Data ({type_key}): {sample.get('code')} - {sample.get('desc')[:30]}...")
        
        # Theme
        theme = await db.theme_configs.find_one({"user_id": "default"})
        if theme:
            print(f"   Theme Config: {theme.get('user_id')} - {len(theme.get('config', {}))} settings")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        raise e
    
    finally:
        client.close()
        print("\n🔌 Database connection closed.")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "rollback":
            asyncio.run(rollback())
        elif command == "verify":
            asyncio.run(verify())
        else:
            print(f"Unknown command: {command}")
            print("Usage: python migrate.py [migrate|rollback|verify]")
    else:
        asyncio.run(migrate())
