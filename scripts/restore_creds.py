import base64
import json
import os

token = "eyJhIjoiMjMwYjU5ZTg4ZDM3NzAwNWNkODI1ZTY1MzNhMWViMGQiLCJzIjoiTWpkaE9XWmhPV010TXpkbU9DMDBaRE13TFdJNVpERXRZVEkxTnpKa016aGtOVEJqIiwidCI6IjkxZDZlYjc2LWJkMzQtNDY1NS05NGIzLWEzMGI2MmY3ZWI4OSJ9"

try:
    decoded = base64.b64decode(token).decode('utf-8')
    data = json.loads(decoded)
    
    # Map to credentials format
    # Token has a, s, t keys. Credentials file uses AccountTag, TunnelSecret, TunnelID
    creds = {
        "AccountTag": data['a'],
        "TunnelSecret": data['s'],
        "TunnelID": data['t']
    }
    
    output_path = "/Users/shanti/.cloudflared/91d6eb76-bd34-4655-94b3-a30b62f7eb89.json"
    
    with open(output_path, 'w') as f:
        json.dump(creds, f)
        
    print(f"Successfully wrote credentials to {output_path}")
    print(f"TunnelID: {creds['TunnelID']}")
    
except Exception as e:
    print(f"Error: {e}")
