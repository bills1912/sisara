"""
Helper script to resolve MongoDB Atlas SRV record and get standard connection string.
This is useful when you have DNS issues with mongodb+srv:// connections.

Usage:
    pip install dnspython
    python resolve_srv.py
"""

try:
    import dns.resolver
except ImportError:
    print("❌ dnspython not installed. Run: pip install dnspython")
    exit(1)

# Your MongoDB Atlas cluster info
CLUSTER_HOST = "cluster0.lhmox.mongodb.net"
USERNAME = "ricardozalukhu1925"
PASSWORD = "kuran1925"  # In production, use environment variables!
DATABASE = "budget_system"


def resolve_srv():
    """Resolve SRV record to get individual host addresses."""
    print(f"🔍 Resolving SRV record for: _mongodb._tcp.{CLUSTER_HOST}")
    
    try:
        # Resolve SRV record
        srv_records = dns.resolver.resolve(f"_mongodb._tcp.{CLUSTER_HOST}", "SRV")
        
        hosts = []
        for record in srv_records:
            host = str(record.target).rstrip('.')
            port = record.port
            hosts.append(f"{host}:{port}")
            print(f"   Found: {host}:{port}")
        
        # Resolve TXT record for options
        try:
            txt_records = dns.resolver.resolve(CLUSTER_HOST, "TXT")
            options = []
            for record in txt_records:
                for txt in record.strings:
                    options.append(txt.decode('utf-8'))
            print(f"   TXT options: {options}")
        except:
            options = ["authSource=admin"]
        
        # Build standard connection string
        hosts_str = ",".join(hosts)
        options_str = "&".join(options) if options else "authSource=admin"
        
        connection_string = f"mongodb://{USERNAME}:{PASSWORD}@{hosts_str}/?ssl=true&{options_str}&retryWrites=true&w=majority"
        
        print("\n✅ Standard Connection String:")
        print("=" * 80)
        print(connection_string)
        print("=" * 80)
        
        print("\n📋 Copy this to your .env file as MONGODB_URL")
        
        return connection_string
        
    except dns.resolver.NXDOMAIN:
        print(f"❌ Domain not found: {CLUSTER_HOST}")
    except dns.resolver.NoAnswer:
        print(f"❌ No SRV record found for: {CLUSTER_HOST}")
    except dns.resolver.Timeout:
        print(f"❌ DNS query timed out")
        print("\n💡 Try using Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return None


def test_connection(connection_string):
    """Test the connection string."""
    from pymongo import MongoClient
    
    print("\n🔗 Testing connection...")
    try:
        client = MongoClient(
            connection_string,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            tls=True
        )
        client.admin.command('ping')
        print("✅ Connection successful!")
        
        # List databases
        dbs = client.list_database_names()
        print(f"📦 Available databases: {dbs}")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


if __name__ == "__main__":
    conn_str = resolve_srv()
    if conn_str:
        test_connection(conn_str)
