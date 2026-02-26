"""
Reset state and run agent on all PDFs.
- Truncates the cases table
- Moves all PDFs from processed/ and errors/ back to inbox/
- Runs the agent on all PDFs in inbox (then exits via MAX_PDFS)

Usage (from files/):
  python reset_and_run.py
"""
import os
import sys
import time
from pathlib import Path

# Reuse agent config
from dotenv import load_dotenv
load_dotenv()

_AGENT_DIR = Path(__file__).resolve().parent
WATCH_DIR  = Path(os.getenv("WATCH_DIR", str(_AGENT_DIR / "inbox")))
DONE_DIR   = Path(os.getenv("DONE_DIR",  str(_AGENT_DIR / "processed")))
ERROR_DIR  = Path(os.getenv("ERROR_DIR", str(_AGENT_DIR / "errors")))
DB_URL     = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/privacy_cases")


def reset_db():
    import psycopg2
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE cases RESTART IDENTITY;")
        conn.commit()
    print("Database: cases table truncated.")


def move_pdfs_to_inbox():
    inbox = WATCH_DIR
    for folder in (DONE_DIR, ERROR_DIR):
        if not folder.exists():
            continue
        for pdf in folder.glob("*.pdf"):
            dest = inbox / pdf.name
            if dest.exists():
                dest = inbox / f"{pdf.stem}_{int(time.time())}{pdf.suffix}"
            pdf.rename(dest)
            print(f"Moved to inbox: {pdf.name} -> {dest.name}")


def main():
    print("Resetting: clearing DB and moving PDFs to inbox...")
    reset_db()
    for d in (DONE_DIR, ERROR_DIR):
        d.mkdir(parents=True, exist_ok=True)
    inbox = WATCH_DIR
    inbox.mkdir(parents=True, exist_ok=True)
    move_pdfs_to_inbox()

    existing = list(inbox.rglob("*.pdf"))
    n = len(existing)
    print(f"Inbox now has {n} PDF(s). Running agent (MAX_PDFS={n})...")
    # Run agent with limit so it processes all and exits
    env = os.environ.copy()
    env["MAX_PDFS"] = str(max(n, 1))
    os.chdir(_AGENT_DIR)
    import subprocess
    r = subprocess.run([sys.executable, "agent.py"], env=env)
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
