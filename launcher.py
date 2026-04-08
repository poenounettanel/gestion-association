import os
import sys
import subprocess
import time
import webbrowser
import socket

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def launch():
    print("Démarrage de CassaManager PRO...")
    
    # Path to server.py relative to launcher
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Try current dir and app/ sub dir
    paths = [
        os.path.join(base_dir, "server.py"),
        os.path.join(base_dir, "app", "server.py"),
        # For bundled exe, check relative to exe
        os.path.join(os.path.dirname(sys.executable), "server.py"),
        os.path.join(os.path.dirname(sys.executable), "app", "server.py")
    ]
    
    server_path = None
    for p in paths:
        if os.path.exists(p):
            server_path = p
            break
            
    if not server_path:
        print("Erreur: Impossible de trouver server.py")
        return

    if not is_port_in_use(5000):
        # Start server in background
        subprocess.Popen(["python", server_path], creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        print("Serveur lancé.")
        time.sleep(2) # Wait for startup
    else:
        print("Le serveur est déjà en cours d'exécution.")

    # Open in app mode if possible (Chrome or Edge)
    url = "http://localhost:5000"
    
    # Try Edge as it's standard on Windows
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if os.path.exists(edge_path):
        subprocess.Popen([edge_path, f"--app={url}"])
    else:
        # Fallback to default browser
        webbrowser.open(url)

if __name__ == "__main__":
    launch()
