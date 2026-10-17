import psycopg2

def run_migration():
    conn = psycopg2.connect("postgresql://civicfix_user:civicfix_password_2026@localhost:5433/civicfix")
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        cur.execute("ALTER TYPE issuestatus ADD VALUE IF NOT EXISTS 'CERTIFIED' AFTER 'RESOLVED';")
        print("Enum issuestatus updated with CERTIFIED")
    except Exception as e:
        print("Enum migration note:", e)

    try:
        cur.execute("ALTER TABLE issues ADD COLUMN IF NOT EXISTS certified_at TIMESTAMP WITH TIME ZONE;")
        cur.execute("ALTER TABLE issues ADD COLUMN IF NOT EXISTS certified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")
        cur.execute("ALTER TABLE issues ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;")
        print("Columns certified_at, certified_by_user_id, and department_id ensured on issues table")
    except Exception as e:
        print("Column migration error:", e)

    conn.close()

if __name__ == "__main__":
    run_migration()
