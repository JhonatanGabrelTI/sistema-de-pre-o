import time
import os
import sys
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# Get DATABASE_URL from .env
def get_db_url():
    with open('backend/.env', 'r') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    return None

db_url = get_db_url()
if not db_url:
    print("DATABASE_URL not found")
    sys.exit(1)

direct_host = "db.pajoujhitlznjpwkabnc.supabase.co"
direct_db_url = db_url.replace("aws-0-us-west-2.pooler.supabase.com", direct_host).replace(":6543", ":5432")

try:
    # 1. Hashing Speed
    print("\n--- Phase 1: Hashing Speed (4 rounds) ---")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)
    t0 = time.time()
    pwd_context.hash("test")
    print(f"Bcrypt hash time: {time.time() - t0:.3f}s")

    # 2. Pooler Latency
    print("\n--- Phase 2: Pooler (6543) ---")
    engine = create_engine(db_url)
    t0 = time.time()
    with engine.connect() as conn:
        print(f"Connection establishment: {time.time() - t0:.3f}s")
        t0 = time.time()
        conn.execute(text("SELECT 1")).fetchone()
        print(f"Query (SELECT 1): {time.time() - t0:.3f}s")

    # 3. Direct Latency
    print("\n--- Phase 3: Direct (5432) ---")
    engine_d = create_engine(direct_db_url)
    t0 = time.time()
    try:
        with engine_d.connect() as conn:
            print(f"Connection establishment: {time.time() - t0:.3f}s")
            t0 = time.time()
            conn.execute(text("SELECT 1")).fetchone()
            print(f"Query (SELECT 1): {time.time() - t0:.3f}s")
    except Exception as e:
        print(f"Direct connection failed: {e}")

except Exception as e:
    print(f"Error: {e}")
