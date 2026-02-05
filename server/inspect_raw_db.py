
import sqlite3
import os

def inspect_raw():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "data", "scripts.db")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Inspecting DB: {db_path}")
    
    # Get latest updated persona
    cursor.execute("SELECT displayName, defaultLicenseTerms, tags FROM personas ORDER BY updatedAt DESC LIMIT 1")
    row = cursor.fetchone()
    
    if row:
        print(f"Display Name: {row[0]}")
        print(f"Raw Terms: {row[1]} (Type: {type(row[1])})")
        print(f"Raw Tags: {row[2]} (Type: {type(row[2])})")
    else:
        print("No personas found")
        
    conn.close()

if __name__ == "__main__":
    inspect_raw()
