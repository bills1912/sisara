"""
Migration Script for SISARA Budget System
Handles DNS issues with MongoDB Atlas SRV connections.

Usage:
    python migrate_sync.py              # Run migration
    python migrate_sync.py verify       # Verify database state  
    python migrate_sync.py rollback     # Delete all data
"""

import os
import sys
from pymongo import MongoClient
from bson import ObjectId

# =============================================================================
# CONFIGURATION - Update password here!
# =============================================================================
USERNAME = "ricardozalukhu1925"
PASSWORD = "kuran1925"  # <-- Ganti dengan password Anda yang benar
CLUSTER = "cluster0.lhmox.mongodb.net"
DATABASE_NAME = "budget_system"

# Try to get from environment variable first
MONGODB_URL = os.environ.get("MONGODB_URL", None)

# =============================================================================
# CONNECTION STRING BUILDER
# =============================================================================

def get_connection_string():
    """Build connection string, trying to resolve SRV if needed."""
    
    # If environment variable is set, use it
    if MONGODB_URL:
        print(f"📡 Using MONGODB_URL from environment")
        return MONGODB_URL
    
    # Try to resolve SRV record manually
    try:
        import dns.resolver
        
        print(f"🔍 Resolving SRV record for cluster...")
        
        # Use Google DNS resolver to avoid local DNS issues
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ['8.8.8.8', '8.8.4.4', '1.1.1.1']
        resolver.timeout = 10
        resolver.lifetime = 30
        
        # Resolve SRV
        srv_records = resolver.resolve(f"_mongodb._tcp.{CLUSTER}", "SRV")
        
        hosts = []
        for record in srv_records:
            host = str(record.target).rstrip('.')
            port = record.port
            hosts.append(f"{host}:{port}")
            print(f"   ✓ Found host: {host}:{port}")
        
        # Try to get replicaSet from TXT record
        replica_set = None
        try:
            txt_records = resolver.resolve(CLUSTER, "TXT")
            for record in txt_records:
                for txt in record.strings:
                    txt_str = txt.decode('utf-8')
                    if 'replicaSet=' in txt_str:
                        for part in txt_str.split('&'):
                            if part.startswith('replicaSet='):
                                replica_set = part.split('=')[1]
        except:
            pass
        
        # Build standard connection string
        hosts_str = ",".join(hosts)
        conn_str = f"mongodb://{USERNAME}:{PASSWORD}@{hosts_str}/?ssl=true&authSource=admin&retryWrites=true&w=majority"
        
        if replica_set:
            conn_str += f"&replicaSet={replica_set}"
        
        print(f"   ✓ Built standard connection string")
        return conn_str
        
    except ImportError:
        print("⚠️  dnspython not installed, using SRV format directly")
    except Exception as e:
        print(f"⚠️  Could not resolve SRV: {e}")
        print("   Falling back to SRV format...")
    
    # Fallback to SRV format
    return f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0"


# =============================================================================
# INITIAL DATA
# =============================================================================

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

DEFAULT_THEME = {
    "UNCHANGED": "#ffffff",
    "CHANGED": "#fed7aa",
    "NEW": "#a5f3fc",
    "DELETED": "#ef4444",
    "BLOCKED": "#d8b4fe"
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def flatten_budget_data(data: list, parent_id: str = None) -> list:
    """Flatten hierarchical budget data for MongoDB storage."""
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
        
        if item.get("children"):
            child_docs = flatten_budget_data(item["children"], item["id"])
            documents.extend(child_docs)
    
    return documents


def get_client():
    """Get MongoDB client with proper settings."""
    conn_str = get_connection_string()
    
    print(f"\n🔗 Connecting to MongoDB...")
    
    client = MongoClient(
        conn_str,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        tls=True,
        tlsAllowInvalidCertificates=False
    )
    
    return client


# =============================================================================
# MIGRATION FUNCTIONS
# =============================================================================

def migrate():
    """Run the migration."""
    print("=" * 60)
    print("🚀 SISARA Database Migration")
    print("=" * 60)
    
    client = get_client()
    db = client[DATABASE_NAME]
    
    try:
        # Test connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!\n")
        
        # Clear existing data
        print("🗑️  Clearing existing collections...")
        db.budget_rows.delete_many({})
        db.master_data.delete_many({})
        db.theme_configs.delete_many({})
        print("   ✓ Collections cleared")
        
        # Migrate Budget Data
        print("\n📊 Migrating Budget Data...")
        budget_docs = flatten_budget_data(INITIAL_BUDGET_DATA)
        if budget_docs:
            result = db.budget_rows.insert_many(budget_docs)
            print(f"   ✓ Inserted {len(result.inserted_ids)} budget rows")
        
        # Create indexes
        db.budget_rows.create_index("parent_id")
        db.budget_rows.create_index("type")
        db.budget_rows.create_index("code")
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
            result = db.master_data.insert_many(master_docs)
            print(f"   ✓ Inserted {len(result.inserted_ids)} master data items")
        
        db.master_data.create_index("type")
        db.master_data.create_index([("type", 1), ("code", 1)], unique=True)
        print("   ✓ Created indexes for master_data")
        
        # Migrate Theme
        print("\n🎨 Migrating Theme Configuration...")
        theme_doc = {
            "_id": str(ObjectId()),
            "user_id": "default",
            "config": DEFAULT_THEME
        }
        db.theme_configs.insert_one(theme_doc)
        db.theme_configs.create_index("user_id", unique=True)
        print("   ✓ Inserted default theme configuration")
        
        # Summary
        print("\n" + "=" * 60)
        print("✅ Migration Summary:")
        print(f"   • Budget Rows: {db.budget_rows.count_documents({})}")
        print(f"   • Master Data: {db.master_data.count_documents({})}")
        print(f"   • Theme Configs: {db.theme_configs.count_documents({})}")
        print("=" * 60)
        print("\n🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise e
    finally:
        client.close()
        print("🔌 Database connection closed.")


def verify():
    """Verify database state."""
    print("🔍 Verifying Database State...")
    
    client = get_client()
    db = client[DATABASE_NAME]
    
    try:
        client.admin.command('ping')
        print("✅ Connected to MongoDB\n")
        
        collections = db.list_collection_names()
        print(f"📦 Collections in '{DATABASE_NAME}':")
        
        for coll_name in collections:
            count = db[coll_name].count_documents({})
            print(f"   • {coll_name}: {count} documents")
        
        # Sample data
        print("\n📄 Sample Data:")
        
        budget_sample = db.budget_rows.find_one({"parent_id": None})
        if budget_sample:
            print(f"   Budget (root): {budget_sample.get('code')} - {budget_sample.get('description')[:40]}...")
        
        for type_key in ["KRO", "RO", "COMPONENT"]:
            sample = db.master_data.find_one({"type": type_key})
            if sample:
                print(f"   Master ({type_key}): {sample.get('code')} - {sample.get('desc')[:30]}...")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        raise e
    finally:
        client.close()
        print("\n🔌 Connection closed.")


def rollback():
    """Delete all data."""
    print("⚠️  Starting Rollback...")
    
    client = get_client()
    db = client[DATABASE_NAME]
    
    try:
        client.admin.command('ping')
        print("✅ Connected to MongoDB")
        
        db.budget_rows.drop()
        db.master_data.drop()
        db.theme_configs.drop()
        
        print("✅ All collections dropped")
        
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        raise e
    finally:
        client.close()
        print("🔌 Connection closed.")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "rollback":
            rollback()
        elif command == "verify":
            verify()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python migrate_sync.py [verify|rollback]")
    else:
        migrate()
