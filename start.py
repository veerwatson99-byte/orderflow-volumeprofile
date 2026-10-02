"""
BTC Order Flow + Volume Profile Terminal V1
Launcher for Local & Cloud (Render / Heroku)
"""

import http.server
import os
import sys
import threading
import time
import webbrowser

PORT = int(os.environ.get("PORT", 8080))
HOST = "0.0.0.0"

def open_browser():
    # Skip opening browser if running in cloud / Render environment
    if os.environ.get("RENDER"):
        return
    time.sleep(1)
    url = f"http://localhost:{PORT}"
    print(f"\n[+] Opening browser to: {url}\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for fast live updates
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        # Clean logging format for Render runtime logs
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

if __name__ == '__main__':
    # Ensure current working directory is the project directory
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    print("=" * 60)
    print(" ⚡ VOLUMETRIC CORE | BTC ORDER FLOW + VOLUME PROFILE V1")
    print(f" Listening on: http://{HOST}:{PORT}")
    print(f" Environment: {'Render Cloud' if os.environ.get('RENDER') else 'Local'}")
    print("=" * 60)

    # Launch browser only on local desktop
    if not os.environ.get("RENDER"):
        threading.Thread(target=open_browser, daemon=True).start()

    CustomHandler.extensions_map.update({
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
    })

    # ThreadingHTTPServer handles concurrent requests gracefully without blocking
    httpd = http.server.ThreadingHTTPServer((HOST, PORT), CustomHandler)
    httpd.allow_reuse_address = True

    print(f"[*] Engine is LIVE. Ready to serve requests.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[-] Server stopped.")
        httpd.server_close()
