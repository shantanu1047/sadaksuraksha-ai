"""
SadakSuraksha AI Database Module
Integrates Vercel Postgres, Neon, Supabase, Cloud DB, and SQLite.
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

def init_db():
    """Ensures tables exist in either PostgreSQL or SQLite."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=4) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "CREATETABLEIS_NOT_EXISTS persisted_hazards (" +
                        "id VARCHAR(64) PRIMARY KEY, data JSONB NOT NULL, " +
                        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
                    )
                    conn.commit()
                    logger.info("Connected to Vercel Postgres / PostgreSQL successfully.")
                    return "postgres"
        except Exception as e:
            logger.warning(f"Vercel Postgres connection failed, falling back to SQLite: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            cur.execute(
                "CREATE TABLE IF NOT EXISTS persisted_hazards (" +
                "id TEXT PRIMARY KEY, data TEXT NOT NULL, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
            )
            conn.commit()
            return "sqlite"
    except Exception as e:
        logger.error(f"SQLite initialization error: {e}")
        return "memory"

def fetch_db_hazards() -> List[Dict[str, Any]]:
    """Fetches raw hazard records from Vercel Postgres or SQLite."""
    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM persisted_hazards ORDER BY created_at DESC LIMIT 200;")
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
                cur.execute("SELECT data FROM persisted_hazards ORDER BY created_at DESC LIMIT 200;")
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

def save_db_hazards(hazards: List[Dict[str, Any]]) -> bool:
    """Saves hazard records into Vercel Postgres or SQLite."""
    if not hazards:
        return True

    pg_url = get_postgres_url()
    if pg_url and PSYCOPG2_AVAILABLE:
        try:
            with psycopg2.connect(pg_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    for h in hazards:
                        hid = h.get("id")
                        if not hid:
                            continue
                        cur.execute(
                            "INSERT INTO persisted_hazards (id, data) VALUES (%s, %sql_json) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;".replace("%sql_json", "%s"),
                            (hid, json.dumps(h, default=str))
                        )
                    conn.commit()
                    return True
        except Exception as e:
            logger.debug(f"Postgres save error: {e}")

    try:
        sqlite_file = get_sqlite_path()
        with sqlite3.connect(str(sqlite_file)) as conn:
            cur = conn.cursor()
            for h in hazards:
                hid = h.get("id")
                if not hid:
                    continue
                cur.execute(
                    "INSERT OR REPLACE INTO persisted_hazards (id, data) VALUES (?, ?);",
                    (hid, json.dumps(h, default=str))
                )
            conn.commit()
            return True
    except Exception as e:
        logger.debug(f"SQLite save error: {e}")


    return False

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
                conn.commit()
                return True
    except Exception as e:
        logger.debug(f"SQLite clear error: {e}")

    return False

def get_database_info() -> Dict[str, Any]:
    pg_url = get_postgres_url()
    driver = "Vercel Postgres (PostgreSQL)" if (pg_url and PSYCOPG2_AVAILABLE) else "SQLite 3 (Embedded / Serverless)"
    return {
        "configured": bool(pg_url),
        "driver": driver,
        "psycopg2_available": PSYCOPG2_AVAILABLE,
        "sqlite_path": str(get_sqlite_path())
    }
