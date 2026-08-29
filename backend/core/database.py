"""
SadakSuraksha AI Database Module
Integrates Vercel Postgres, Neon, Supabase, Cloud DB, and SQLite.
Provides full CRUD (Create, Read, Update, Delete) and state persistence
for road hazards, spatial work orders, and citizen reports with atomic
disk fallback (persisted_citizen_hazards.json) from custom-dev.
"""

import os
import json
import sqlite3
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse, parse_qs
import urllib.request
import ssl

logger = logging.getLogger("sadaksuraksha.database")

# Detect PG drivers: pg8000 (pure-Python, serverless-safe) or psycopg2 (standard binary)
PG_DRIVER = None
try:
    import pg8000.dbapi as pg8000_driver
    PG_DRIVER = "pg8000"
except ImportError:
    try:
        import psycopg2
        import psycopg2.extras
        PG_DRIVER = "psycopg2"
    except ImportError:
        PG_DRIVER = None

_pg_connection = None


def is_serverless_environment() -> bool:
    """Detects whether code is running within Vercel Serverless or AWS Lambda."""
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        or os.environ.get("LAMBDA_TASK_ROOT")
        or os.environ.get("NOW_REGION")
    )


def get_postgres_url() -> Optional[str]:
    """Resolves Vercel Postgres, Neon, Supabase, or PostgreSQL connection URL from environment."""
    for key in [
        "POSTGRES_URL",
        "DATABASE_URL",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "VERCEL_POSTGRES_URL",
        "NEON_DATABASE_URL",
        "SUPABASE_DB_URL",
    ]:
        val = os.environ.get(key, "").strip()
        if val:
            if val.startswith("postgres://"):
                val = "postgresql://" + val[len("postgres://"):]
            if "@" in val and "sslmode=" not in val:
                val += ("&" if "?" in val else "?") + "sslmode=require"
            return val

    # Fallback to individual components
    user = os.environ.get("POSTGRES_USER")
    pw = os.environ.get("POSTGRES_PASSWORD")
    host = os.environ.get("POSTGRES_HOST")
    db = os.environ.get("POSTGRES_DATABASE")
    if user and pw and host and db:
        port = os.environ.get("POSTGRES_PORT", "5432")
        return f"postgresql://{user}:{pw}@{host}:{port}/{db}?sslmode=require"

    return None


def get_pg_connection():
    """Returns an active PostgreSQL connection with automatic reconnection and fallback."""
    global _pg_connection
    pg_url = get_postgres_url()
    if not pg_url or not PG_DRIVER:
        return None

    # Check existing connection health
    if _pg_connection is not None:
        try:
            with _pg_connection.cursor() as cur:
                cur.execute("SELECT 1;")
            return _pg_connection
        except Exception:
            try:
                _pg_connection.close()
            except Exception:
                pass
            _pg_connection = None

    # Establish new connection
    try:
        if PG_DRIVER == "pg8000":
            parsed = urlparse(pg_url)
            user = parsed.username
            password = parsed.password
            host = parsed.hostname
            port = parsed.port or 5432
            database = parsed.path.lstrip("/")
            
            ssl_ctx = None
            query_params = parse_qs(parsed.query)
            sslmode = query_params.get("sslmode", ["require"])[0]
            if sslmode in ("require", "verify-ca", "verify-full") or ("vercel" in str(host) or "neon" in str(host) or "supabase" in str(host)):
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE

            _pg_connection = pg8000_driver.connect(
                user=user,
                password=password,
                host=host,
                port=port,
                database=database,
                ssl_context=ssl_ctx,
                timeout=10
            )
            return _pg_connection
        elif PG_DRIVER == "psycopg2":
            import psycopg2
            _pg_connection = psycopg2.connect(pg_url, connect_timeout=8)
            return _pg_connection
    except Exception as e:
        logger.debug(f"PostgreSQL connection note: {e}")
        return None


def get_sqlite_path() -> Path:
    """Returns a writable SQLite database file path. On Vercel / serverless, forces /tmp to avoid read-only filesystem errors."""
    if is_serverless_environment():
        tmp_db = Path("/tmp") / "sadaksuraksha.db"
        tmp_db.parent.mkdir(parents=True, exist_ok=True)
        return tmp_db

    base_dir = Path(__file__).resolve().parent.parent.parent / "database"
    try:
        base_dir.mkdir(parents=True, exist_ok=True)
        test_file = base_dir / ".write_probe"
        with open(test_file, "w") as f:
            f.write("1")
        test_file.unlink(missing_ok=True)
        return base_dir / "sadaksuraksha.db"
    except Exception:
        tmp_db = Path("/tmp") / "sadaksuraksha.db"
        tmp_db.parent.mkdir(parents=True, exist_ok=True)
        return tmp_db


def get_storage_paths() -> List[Path]:
    """Returns all filesystem candidate locations for atomic JSON sync (custom-dev pattern)."""
    paths = []
    try:
        base = Path(__file__).resolve().parent.parent.parent / "database"
        base.mkdir(parents=True, exist_ok=True)
        paths.append(base / "persisted_citizen_hazards.json")
    except Exception:
        pass

    try:
        paths.append(Path.cwd() / "database" / "persisted_citizen_hazards.json")
    except Exception:
        pass

    try:
        paths.append(Path("/tmp") / "persisted_citizen_hazards.json")
    except Exception:
        pass

    return paths


def get_cloud_endpoint() -> Optional[str]:
    url = os.environ.get("CLOUD_DB_URL", "").strip()
    return url if url else None


def fetch_hazards_from_cloud() -> List[Dict[str, Any]]:
    """Fetches real-time persisted citizen complaints from Cloud Database if configured (custom-dev pattern)."""
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return []
    try:
        req = urllib.request.Request(
            endpoint,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            if res.status == 200:
                raw = res.read().decode("utf-8")
                res_obj = json.loads(raw)
                data_block = res_obj.get("data", {}) if isinstance(res_obj, dict) else {}
                hazards_list = data_block.get("hazards", []) if isinstance(data_block, dict) else []
                if isinstance(hazards_list, list):
                    return [d for d in hazards_list if isinstance(d, dict) and d.get("id")]
    except Exception as e:
        logger.debug(f"Cloud DB fetch note: {e}")
    return []


def save_hazards_to_cloud(hazards: List[Dict[str, Any]]) -> bool:
    """Saves citizen hazard list atomically to Cloud Database if configured (custom-dev pattern)."""
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return False
    try:
        citizen_only = [h for h in hazards if isinstance(h, dict) and h.get("id")]
        payload = json.dumps({
            "name": "sadaksuraksha_hazards_store",
            "data": {"hazards": citizen_only[:100]}
        }, default=str).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            return res.status in (200, 201)
    except Exception as e:
        logger.debug(f"Cloud DB save note: {e}")
        return False


def clear_cloud_hazards():
    endpoint = get_cloud_endpoint()
    if not endpoint:
        return
    try:
        payload = json.dumps({
            "name": "sadaksuraksha_hazards_store",
            "data": {"hazards": []}
        }).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SadakSuraksha-Production/1.0",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            pass
    except Exception as e:
        logger.debug(f"Cloud DB clear note: {e}")


def init_db() -> str:
    """Ensures tables exist in PostgreSQL, SQLite, or disk stores."""
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # 1. Hazards Table
                cur.execute(
                    "CREATE TABLE IF NOT EXISTS persisted_hazards ("
                    "id VARCHAR(64) PRIMARY KEY, "
                    "status VARCHAR(50) DEFAULT 'Active', "
                    "data JSONB NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
                )
                # 2. Work Orders Table
                cur.execute(
                    "CREATE TABLE IF NOT EXISTS persisted_work_orders ("
                    "id VARCHAR(64) PRIMARY KEY, "
                    "status VARCHAR(50) DEFAULT 'scheduled', "
                    "data JSONB NOT NULL, "
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
                )
                # 3. Citizen Reports Table
                cur.execute(
                    "CREATE TABLE IF NOT EXISTS persisted_citizen_reports ("
                    "ticket_id VARCHAR(64) PRIMARY KEY, "
                    "hazard_id VARCHAR(64), "
                    "status VARCHAR(50) DEFAULT 'received', "
                    "data JSONB NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
                )
                conn.commit()
                logger.info("Connected and initialized Vercel Postgres / PostgreSQL schema.")
                return "postgres"
        except Exception as e:
            logger.debug(f"PostgreSQL init note: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_hazards ("
                "id TEXT PRIMARY KEY, "
                "status TEXT DEFAULT 'Active', "
                "data TEXT NOT NULL, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_work_orders ("
                "id TEXT PRIMARY KEY, "
                "status TEXT DEFAULT 'scheduled', "
                "data TEXT NOT NULL, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_citizen_reports ("
                "ticket_id TEXT PRIMARY KEY, "
                "hazard_id TEXT, "
                "status TEXT DEFAULT 'received', "
                "data TEXT NOT NULL, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            sconn.commit()
            return "sqlite"
    except Exception as e:
        logger.debug(f"SQLite initialization note: {e}")
        return "disk_json"


# ====================================================================
# HAZARD CRUD & PERSISTENCE
# ====================================================================

def fetch_db_hazards() -> List[Dict[str, Any]]:
    """Fetches raw hazard records from PostgreSQL, SQLite, Cloud DB, or atomic JSON stores."""
    # 1. Try PostgreSQL
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM persisted_hazards ORDER BY updated_at DESC LIMIT 300;")
                rows = cur.fetchall()
                hazards = []
                for (d,) in rows:
                    if isinstance(d, dict):
                        hazards.append(d)
                    elif isinstance(d, str):
                        try:
                            hazards.append(json.loads(d))
                        except Exception:
                            pass
                if hazards:
                    return hazards
        except Exception as e:
            logger.debug(f"PostgreSQL fetch note: {e}")

    # 2. Try SQLite
    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as sconn:
                cur = sconn.cursor()
                cur.execute("SELECT data FROM persisted_hazards ORDER BY updated_at DESC LIMIT 300;")
                rows = cur.fetchall()
                hazards = []
                for (d_str,) in rows:
                    try:
                        hazards.append(json.loads(d_str))
                    except Exception:
                        pass
                if hazards:
                    return hazards
    except Exception as e:
        logger.debug(f"SQLite fetch note: {e}")

    # 3. Fallback: Cloud Database
    cloud_items = fetch_hazards_from_cloud()
    if cloud_items:
        return cloud_items

    # 4. Fallback: Local Disk Stores (custom-dev pattern)
    for p in get_storage_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        data = json.loads(content)
                        if isinstance(data, list) and data:
                            return data
        except Exception:
            pass

    return []


def get_db_hazard(hazard_id: str) -> Optional[Dict[str, Any]]:
    """Reads a single hazard record by ID from database."""
    if not hazard_id:
        return None

    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM persisted_hazards WHERE id = %s;", (hazard_id,))
                row = cur.fetchone()
                if row:
                    d = row[0]
                    return d if isinstance(d, dict) else json.loads(d)
        except Exception as e:
            logger.debug(f"Postgres get hazard note: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as sconn:
                cur = sconn.cursor()
                cur.execute("SELECT data FROM persisted_hazards WHERE id = ?;", (hazard_id,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
    except Exception:
        pass

    # Disk fallback
    for p in get_storage_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
                    for item in data:
                        if item.get("id") == hazard_id:
                            return item
        except Exception:
            pass

    return None


def save_db_hazards(hazards: List[Dict[str, Any]]) -> bool:
    """Creates or updates hazard records across PostgreSQL, SQLite, and atomic JSON stores."""
    if not hazards:
        return True

    # 1. Sync to local & serverless disk paths (instant, rock-solid)
    payload_str = json.dumps(hazards, indent=2, default=str)
    for p in get_storage_paths():
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(payload_str)
        except Exception:
            pass

    # 2. Sync to Cloud DB if configured
    save_hazards_to_cloud(hazards)

    # 3. Sync to PostgreSQL if connected
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                for h in hazards:
                    hid = h.get("id")
                    if not hid:
                        continue
                    status = h.get("status", "Active")
                    cur.execute(
                        "INSERT INTO persisted_hazards (id, status, data, updated_at) "
                        "VALUES (%s, %s, %s, CURRENT_TIMESTAMP) "
                        "ON CONFLICT (id) DO UPDATE SET "
                        "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                        (hid, status, json.dumps(h, default=str))
                    )
                conn.commit()
        except Exception as e:
            logger.debug(f"PostgreSQL save hazards note: {e}")

    # 4. Sync to SQLite
    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            for h in hazards:
                hid = h.get("id")
                if not hid:
                    continue
                status = h.get("status", "Active")
                cur.execute(
                    "INSERT INTO persisted_hazards (id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                    "ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                    (hid, status, json.dumps(h, default=str))
                )
            sconn.commit()
    except Exception as e:
        logger.debug(f"SQLite save hazards note: {e}")

    return True


def update_db_hazard(hazard_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates specific fields of an existing hazard record in database and returns updated object."""
    if not hazard_id or not updates:
        return None

    current = get_db_hazard(hazard_id) or {"id": hazard_id}

    for k, v in updates.items():
        if k == "priority" and isinstance(v, dict) and isinstance(current.get("priority"), dict):
            current["priority"].update(v)
        elif k == "fusion" and isinstance(v, dict) and isinstance(current.get("fusion"), dict):
            current["fusion"].update(v)
        else:
            current[k] = v

    # Persist the updated object
    save_db_hazards([current])
    return current


def delete_db_hazard(hazard_id: str) -> bool:
    """Deletes a hazard from PostgreSQL, SQLite, and atomic JSON stores."""
    if not hazard_id:
        return False

    # 1. Remove from JSON stores
    for p in get_storage_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
                new_data = [item for item in data if item.get("id") != hazard_id]
                with open(p, "w", encoding="utf-8") as f:
                    f.write(json.dumps(new_data, indent=2, default=str))
        except Exception:
            pass

    # 2. Remove from PostgreSQL
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM persisted_hazards WHERE id = %s;", (hazard_id,))
                conn.commit()
        except Exception as e:
            logger.debug(f"PostgreSQL delete hazard note: {e}")

    # 3. Remove from SQLite
    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute("DELETE FROM persisted_hazards WHERE id = ?;", (hazard_id,))
            sconn.commit()
    except Exception as e:
        logger.debug(f"SQLite delete hazard note: {e}")

    return True


def clear_db_hazards() -> bool:
    """Clears all persisted hazard records from all storage layers."""
    clear_cloud_hazards()

    for p in get_storage_paths():
        try:
            if p.exists() or p.parent.exists():
                p.parent.mkdir(parents=True, exist_ok=True)
                with open(p, "w", encoding="utf-8") as f:
                    f.write("[]")
        except Exception:
            pass

    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE persisted_hazards;")
                conn.commit()
        except Exception:
            pass

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute("DELETE FROM persisted_hazards;")
            sconn.commit()
    except Exception:
        pass

    return True


# ====================================================================
# WORK ORDER CRUD & PERSISTENCE
# ====================================================================

def get_work_order_paths() -> List[Path]:
    paths = []
    try:
        base = Path(__file__).resolve().parent.parent.parent / "database"
        base.mkdir(parents=True, exist_ok=True)
        paths.append(base / "persisted_work_orders.json")
    except Exception:
        pass
    try:
        paths.append(Path("/tmp") / "persisted_work_orders.json")
    except Exception:
        pass
    return paths


def fetch_db_work_orders() -> List[Dict[str, Any]]:
    """Fetches work orders from PostgreSQL, SQLite, or disk stores."""
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM persisted_work_orders ORDER BY updated_at DESC LIMIT 100;")
                rows = cur.fetchall()
                orders = []
                for (d,) in rows:
                    orders.append(d if isinstance(d, dict) else json.loads(d))
                if orders:
                    return orders
        except Exception as e:
            logger.debug(f"PostgreSQL fetch work orders note: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as sconn:
                cur = sconn.cursor()
                cur.execute("SELECT data FROM persisted_work_orders ORDER BY updated_at DESC LIMIT 100;")
                rows = cur.fetchall()
                orders = []
                for (d_str,) in rows:
                    try:
                        orders.append(json.loads(d_str))
                    except Exception:
                        pass
                if orders:
                    return orders
    except Exception:
        pass

    # Disk fallback
    for p in get_work_order_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        data = json.loads(content)
                        if isinstance(data, list) and data:
                            return data
        except Exception:
            pass

    return []


def save_db_work_orders(work_orders: List[Dict[str, Any]]) -> bool:
    """Saves work orders to PostgreSQL, SQLite, and JSON disk stores."""
    if not work_orders:
        return True

    # 1. Disk JSON
    payload_str = json.dumps(work_orders, indent=2, default=str)
    for p in get_work_order_paths():
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(payload_str)
        except Exception:
            pass

    # 2. PostgreSQL
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                for wo in work_orders:
                    wo_id = wo.get("id")
                    if not wo_id:
                        continue
                    status = str(wo.get("status", "scheduled"))
                    cur.execute(
                        "INSERT INTO persisted_work_orders (id, status, data, updated_at) "
                        "VALUES (%s, %s, %s, CURRENT_TIMESTAMP) "
                        "ON CONFLICT (id) DO UPDATE SET "
                        "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                        (wo_id, status, json.dumps(wo, default=str))
                    )
                conn.commit()
        except Exception as e:
            logger.debug(f"Postgres save work orders note: {e}")

    # 3. SQLite
    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            for wo in work_orders:
                wo_id = wo.get("id")
                if not wo_id:
                    continue
                status = str(wo.get("status", "scheduled"))
                cur.execute(
                    "INSERT INTO persisted_work_orders (id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                    "ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                    (wo_id, status, json.dumps(wo, default=str))
                )
            sconn.commit()
    except Exception as e:
        logger.debug(f"SQLite save work orders note: {e}")

    return True


def update_db_work_order_status(order_id: str, status: str) -> bool:
    """Updates the status of a work order across PostgreSQL, SQLite, and JSON stores."""
    if not order_id or not status:
        return False

    # Update in disk stores
    for p in get_work_order_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
                updated = False
                for item in data:
                    if item.get("id") == order_id:
                        item["status"] = status
                        updated = True
                if not updated:
                    data.append({"id": order_id, "status": status})
                with open(p, "w", encoding="utf-8") as f:
                    f.write(json.dumps(data, indent=2, default=str))
        except Exception:
            pass

    # PostgreSQL
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO persisted_work_orders (id, status, data, updated_at) "
                    "VALUES (%s, %s, %s, CURRENT_TIMESTAMP) "
                    "ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;",
                    (order_id, str(status), json.dumps({"id": order_id, "status": str(status)}))
                )
                conn.commit()
        except Exception as e:
            logger.debug(f"Postgres update work order status note: {e}")

    # SQLite
    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute(
                "INSERT INTO persisted_work_orders (id, status, data, updated_at) "
                "VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP;",
                (order_id, str(status), json.dumps({"id": order_id, "status": str(status)}))
            )
            sconn.commit()
    except Exception as e:
        logger.debug(f"SQLite update work order status note: {e}")

    return True


def delete_db_work_order(order_id: str) -> bool:
    """Deletes a work order record."""
    if not order_id:
        return False

    for p in get_work_order_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
                new_data = [item for item in data if item.get("id") != order_id]
                with open(p, "w", encoding="utf-8") as f:
                    f.write(json.dumps(new_data, indent=2, default=str))
        except Exception:
            pass

    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM persisted_work_orders WHERE id = %s;", (order_id,))
                conn.commit()
        except Exception:
            pass

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute("DELETE FROM persisted_work_orders WHERE id = ?;", (order_id,))
            sconn.commit()
    except Exception:
        pass

    return True


# ====================================================================
# CITIZEN REPORT CRUD & PERSISTENCE
# ====================================================================

def get_citizen_report_paths() -> List[Path]:
    paths = []
    try:
        base = Path(__file__).resolve().parent.parent.parent / "database"
        base.mkdir(parents=True, exist_ok=True)
        paths.append(base / "persisted_citizen_reports.json")
    except Exception:
        pass
    try:
        paths.append(Path("/tmp") / "persisted_citizen_reports.json")
    except Exception:
        pass
    return paths


def save_db_citizen_report(ticket: Dict[str, Any]) -> bool:
    """Saves or updates a citizen report across PostgreSQL, SQLite, and JSON stores."""
    if not ticket or not ticket.get("ticket_id"):
        return False

    tid = ticket["ticket_id"]
    hid = ticket.get("hazard_id")
    status = ticket.get("status", "received")
    data_str = json.dumps(ticket, default=str)

    # 1. Disk JSON
    for p in get_citizen_report_paths():
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            data = []
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
            data = [item for item in data if item.get("ticket_id") != tid]
            data.insert(0, ticket)
            with open(p, "w", encoding="utf-8") as f:
                f.write(json.dumps(data[:100], indent=2, default=str))
        except Exception:
            pass

    # 2. PostgreSQL
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO persisted_citizen_reports (ticket_id, hazard_id, status, data, updated_at) "
                    "VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP) "
                    "ON CONFLICT (ticket_id) DO UPDATE SET "
                    "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                    (tid, hid, status, data_str)
                )
                conn.commit()
        except Exception as e:
            logger.debug(f"Postgres save citizen report note: {e}")

    # 3. SQLite
    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as sconn:
            cur = sconn.cursor()
            cur.execute(
                "INSERT INTO persisted_citizen_reports (ticket_id, hazard_id, status, data, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(ticket_id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                (tid, hid, status, data_str)
            )
            sconn.commit()
    except Exception as e:
        logger.debug(f"SQLite save citizen report note: {e}")

    return True


def get_db_citizen_report(ticket_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single citizen report ticket by ID."""
    if not ticket_id:
        return None

    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM persisted_citizen_reports WHERE ticket_id = %s;", (ticket_id,))
                row = cur.fetchone()
                if row:
                    d = row[0]
                    return d if isinstance(d, dict) else json.loads(d)
        except Exception as e:
            logger.debug(f"Postgres get ticket note: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as sconn:
                cur = sconn.cursor()
                cur.execute("SELECT data FROM persisted_citizen_reports WHERE ticket_id = ?;", (ticket_id,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
    except Exception:
        pass

    for p in get_citizen_report_paths():
        try:
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    data = json.loads(f.read().strip() or "[]")
                    for item in data:
                        if item.get("ticket_id") == ticket_id:
                            return item
        except Exception:
            pass

    return None


# ====================================================================
# DIAGNOSTICS & SYSTEM INFO
# ====================================================================

def get_database_info() -> Dict[str, Any]:
    pg_url = get_postgres_url()
    conn = get_pg_connection()
    driver = "Vercel Postgres (PostgreSQL Active)" if conn else (
        "PostgreSQL Configured (Connecting...)" if pg_url else "SQLite 3 (Embedded / Serverless Active)"
    )
    return {
        "configured": bool(pg_url),
        "driver": driver,
        "postgres_connected": bool(conn),
        "pg_driver": PG_DRIVER or "None",
        "sqlite_path": str(get_sqlite_path()),
        "cloud_db_configured": bool(get_cloud_endpoint()),
        "is_serverless": is_serverless_environment()
    }
