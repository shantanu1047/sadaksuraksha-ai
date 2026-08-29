"""
SadakSuraksha AI Database Module
Integrates Vercel Postgres, Neon, Supabase, Cloud DB, and SQLite.
Provides full CRUD (Create, Read, Update, Delete) and state persistence
for road hazards, spatial work orders, and citizen reports.
"""

import os
import json
import sqlite3
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

logger = logging.getLogger("sadaksuraksha.database")

def get_postgres_url() -> Optional[str]:
    """Resolves Vercel Postgres, Neon, Supabase, or PostgreSQL connection URL from environment."""
    for key in ["POSTGRES_URL", "DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"]:
        val = os.environ.get(key, "").strip()
        if val:
            if val.startswith("postgres://"):
                val = "postgresql://" + val[len("postgres://"):]
            return val
    return None

def get_sqlite_path() -> Path:
    base_dir = Path(__file__).resolve().parent.parent.parent / "database"
    try:
        base_dir.mkdir(parents=True, exist_ok=True)
        return base_dir / "sadaksuraksha.db"
    except Exception:
        tmp_dir = Path("/tmp")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        return tmp_dir / "sadaksuraksha.db"

def init_db() -> str:
    """Ensures tables exist in either PostgreSQL or SQLite."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=4) as conn:
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
            logger.warning(f"Vercel Postgres connection failed, falling back to SQLite: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            # 1. Hazards Table
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_hazards ("
                "id TEXT PRIMARY KEY, "
                "status TEXT DEFAULT 'Active', "
                "data TEXT NOT NULL, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            # 2. Work Orders Table
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_work_orders ("
                "id TEXT PRIMARY KEY, "
                "status TEXT DEFAULT 'scheduled', "
                "data TEXT NOT NULL, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            # 3. Citizen Reports Table
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_citizen_reports ("
                "ticket_id TEXT PRIMARY KEY, "
                "hazard_id TEXT, "
                "status TEXT DEFAULT 'received', "
                "data TEXT NOT NULL, "
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            conn.commit()
            return "sqlite"
    except Exception as e:
        logger.error(f"SQLite initialization error: {e}")
        return "memory"

# ====================================================================
# HAZARD CRUD & UPDATING FUNCTIONS
# ====================================================================

def fetch_db_hazards() -> List[Dict[str, Any]]:
    """Fetches raw hazard records from Vercel Postgres or SQLite."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_hazards ORDER BY updated_at DESC LIMIT 300;")
                    rows = cur.fetchall()
                    hazards = []
                    for (d,) in rows:
                        if isinstance(d, dict):
                            hazards.append(d)
                        elif isinstance(d, str):
                            hazards.append(json.loads(d))
                    return hazards
        except Exception as e:
            logger.debug(f"Postgres fetch error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("SELECT data FROM persisted_hazards ORDER BY updated_at DESC LIMIT 300;")
                rows = cur.fetchall()
                hazards = []
                for (d_str,) in rows:
                    try:
                        hazards.append(json.loads(d_str))
                    except Exception:
                        pass
                return hazards
    except Exception as e:
        logger.debug(f"SQLite fetch error: {e}")

    return []

def get_db_hazard(hazard_id: str) -> Optional[Dict[str, Any]]:
    """Reads a single hazard record by ID from database."""
    if not hazard_id:
        return None
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_hazards WHERE id = %s;", (hazard_id,))
                    row = cur.fetchone()
                    if row:
                        d = row[0]
                        return d if isinstance(d, dict) else json.loads(d)
        except Exception as e:
            logger.debug(f"Postgres get hazard error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("SELECT data FROM persisted_hazards WHERE id = ?;", (hazard_id,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
    except Exception as e:
        logger.debug(f"SQLite get hazard error: {e}")

    return None

def save_db_hazards(hazards: List[Dict[str, Any]]) -> bool:
    """Creates or updates multiple hazard records in Vercel Postgres or SQLite."""
    if not hazards:
        return True

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=4) as conn:
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
                    return True
        except Exception as e:
            logger.debug(f"Postgres save hazards error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
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
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite save hazards error: {e}")

    return False

def update_db_hazard(hazard_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates specific fields of an existing hazard record in database and returns updated object."""
    if not hazard_id or not updates:
        return None

    # Fetch existing data
    current = get_db_hazard(hazard_id)
    if not current:
        current = {"id": hazard_id}

    # Merge updates
    for k, v in updates.items():
        if k == "priority" and isinstance(v, dict) and isinstance(current.get("priority"), dict):
            current["priority"].update(v)
        elif k == "fusion" and isinstance(v, dict) and isinstance(current.get("fusion"), dict):
            current["fusion"].update(v)
        else:
            current[k] = v

    status = current.get("status", "Active")
    data_str = json.dumps(current, default=str)

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO persisted_hazards (id, status, data, updated_at) "
                        "VALUES (%s, %s, %s, CURRENT_TIMESTAMP) "
                        "ON CONFLICT (id) DO UPDATE SET "
                        "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                        (hazard_id, status, data_str)
                    )
                    conn.commit()
                    return current
        except Exception as e:
            logger.debug(f"Postgres update hazard error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO persisted_hazards (id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                (hazard_id, status, data_str)
            )
            conn.commit()
            return current
    except Exception as e:
        logger.debug(f"SQLite update hazard error: {e}")

    return current

def delete_db_hazard(hazard_id: str) -> bool:
    """Deletes an individual hazard record from Vercel Postgres or SQLite."""
    if not hazard_id:
        return False
        
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM persisted_hazards WHERE id = %s;", (hazard_id,))
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres delete error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("DELETE FROM persisted_hazards WHERE id = ?;", (hazard_id,))
                conn.commit()
                return True
    except Exception as e:
        logger.debug(f"SQLite delete error: {e}")

    return False

def clear_db_hazards() -> bool:
    """Empties persisted hazard records."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("TRUNCATE TABLE persisted_hazards;")
                    cur.execute("TRUNCATE TABLE persisted_work_orders;")
                    cur.execute("TRUNCATE TABLE persisted_citizen_reports;")
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres clear error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("DELETE FROM persisted_hazards;")
                cur.execute("DELETE FROM persisted_work_orders;")
                cur.execute("DELETE FROM persisted_citizen_reports;")
                conn.commit()
                return True
    except Exception as e:
        logger.debug(f"SQLite clear error: {e}")

    return False

# ====================================================================
# WORK ORDER CRUD & UPDATING FUNCTIONS
# ====================================================================

def fetch_db_work_orders() -> List[Dict[str, Any]]:
    """Fetches saved work orders from database."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_work_orders ORDER BY updated_at DESC;")
                    rows = cur.fetchall()
                    orders = []
                    for (d,) in rows:
                        orders.append(d if isinstance(d, dict) else json.loads(d))
                    return orders
        except Exception as e:
            logger.debug(f"Postgres fetch work orders error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("SELECT data FROM persisted_work_orders ORDER BY updated_at DESC;")
                rows = cur.fetchall()
                orders = []
                for (d_str,) in rows:
                    try:
                        orders.append(json.loads(d_str))
                    except Exception:
                        pass
                return orders
    except Exception as e:
        logger.debug(f"SQLite fetch work orders error: {e}")

    return []

def save_db_work_orders(orders: List[Dict[str, Any]]) -> bool:
    """Saves work order items to database."""
    if not orders:
        return True

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=4) as conn:
                with conn.cursor() as cur:
                    for o in orders:
                        oid = o.get("id")
                        if not oid:
                            continue
                        st = str(o.get("status", "scheduled"))
                        cur.execute(
                            "INSERT INTO persisted_work_orders (id, status, data, updated_at) "
                            "VALUES (%s, %s, %s, CURRENT_TIMESTAMP) "
                            "ON CONFLICT (id) DO UPDATE SET "
                            "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                            (oid, st, json.dumps(o, default=str))
                        )
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres save work orders error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            for o in orders:
                oid = o.get("id")
                if not oid:
                    continue
                st = str(o.get("status", "scheduled"))
                cur.execute(
                    "INSERT INTO persisted_work_orders (id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                    "ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                    (oid, st, json.dumps(o, default=str))
                )
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite save work orders error: {e}")

    return False

def update_db_work_order_status(order_id: str, new_status: str) -> bool:
    """Updates the status of a work order in database."""
    if not order_id or not new_status:
        return False

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_work_orders WHERE id = %s;", (order_id,))
                    row = cur.fetchone()
                    if row:
                        d = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                        d["status"] = new_status
                        cur.execute(
                            "UPDATE persisted_work_orders SET status = %s, data = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                            (new_status, json.dumps(d, default=str), order_id)
                        )
                    else:
                        cur.execute(
                            "INSERT INTO persisted_work_orders (id, status, data, updated_at) VALUES (%s, %s, %s, CURRENT_TIMESTAMP);",
                            (order_id, new_status, json.dumps({"id": order_id, "status": new_status}))
                        )
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres update work order status error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            cur.execute("SELECT data FROM persisted_work_orders WHERE id = ?;", (order_id,))
            row = cur.fetchone()
            if row:
                d = json.loads(row[0])
                d["status"] = new_status
                cur.execute(
                    "UPDATE persisted_work_orders SET status = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                    (new_status, json.dumps(d, default=str), order_id)
                )
            else:
                cur.execute(
                    "INSERT INTO persisted_work_orders (id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);",
                    (order_id, new_status, json.dumps({"id": order_id, "status": new_status}))
                )
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite update work order status error: {e}")

    return False

def delete_db_work_order(order_id: str) -> bool:
    """Deletes a work order from database."""
    if not order_id:
        return False
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM persisted_work_orders WHERE id = %s;", (order_id,))
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres delete work order error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM persisted_work_orders WHERE id = ?;", (order_id,))
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite delete work order error: {e}")

    return False

# ====================================================================
# CITIZEN REPORT CRUD FUNCTIONS
# ====================================================================

def save_db_citizen_report(ticket: Dict[str, Any]) -> bool:
    """Saves or updates a citizen report in database."""
    if not ticket or not ticket.get("ticket_id"):
        return False
    tid = ticket["ticket_id"]
    hid = ticket.get("hazard_id")
    status = ticket.get("status", "received")
    data_str = json.dumps(ticket, default=str)

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO persisted_citizen_reports (ticket_id, hazard_id, status, data, updated_at) "
                        "VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP) "
                        "ON CONFLICT (ticket_id) DO UPDATE SET "
                        "status = EXCLUDED.status, data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;",
                        (tid, hid, status, data_str)
                    )
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres save citizen report error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO persisted_citizen_reports (ticket_id, hazard_id, status, data, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(ticket_id) DO UPDATE SET status = excluded.status, data = excluded.data, updated_at = CURRENT_TIMESTAMP;",
                (tid, hid, status, data_str)
            )
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite save citizen report error: {e}")

    return False

def get_db_citizen_report(ticket_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single citizen report ticket by ID."""
    if not ticket_id:
        return None
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_citizen_reports WHERE ticket_id = %s;", (ticket_id,))
                    row = cur.fetchone()
                    if row:
                        d = row[0]
                        return d if isinstance(d, dict) else json.loads(d)
        except Exception as e:
            logger.debug(f"Postgres get ticket error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        if sqlite_file.exists():
            with sqlite3.connect(str(sqlite_file)) as conn:
                cur = conn.cursor()
                cur.execute("SELECT data FROM persisted_citizen_reports WHERE ticket_id = ?;", (ticket_id,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
    except Exception as e:
        logger.debug(f"SQLite get ticket error: {e}")

    return None

# ====================================================================
# DIAGNOSTICS & SYSTEM INFO
# ====================================================================

def get_database_info() -> Dict[str, Any]:
    pg_url = get_postgres_url()
    driver = "Vercel Postgres (PostgreSQL)" if (pg_url and PSYCOPG2_AVAILABLE) else "SQLite 3 (Embedded / Serverless)"
    return {
        "configured": bool(pg_url),
        "driver": driver,
        "psycopg2_available": PSYCOPG2_AVAILABLE,
        "sqlite_path": str(get_sqlite_path())
    }
