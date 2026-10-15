#!/usr/bin/env python3
"""
Searchii - Job Aggregator Local Server & TinyFish Proxy
Run: python server.py
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys

PORT = 8080

# Load .env file if present
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()


class SearchiiHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Proxy for TinyFish Search API
        clean_path = '/' + parsed.path.strip('/')
        if clean_path == '/api/search':
            params = urllib.parse.parse_qs(parsed.query)
            query = params.get('query', ['Software Engineer'])[0]
            api_key = self.headers.get('X-API-Key') or os.environ.get('TINYFISH_API_KEY', '')
            if not api_key:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'TinyFish API key missing. Configure TINYFISH_API_KEY in .env or the Settings modal.'}).encode('utf-8'))
                return

            target_url = f"https://api.search.tinyfish.ai?query={urllib.parse.quote(query)}"
            req = urllib.request.Request(target_url, headers={'X-API-Key': api_key})

            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # Proxy for TinyFish Agent API
        clean_path = '/' + parsed.path.strip('/')
        if clean_path == '/api/agent':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            api_key = self.headers.get('X-API-Key') or os.environ.get('TINYFISH_API_KEY', '')
            if not api_key:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'TinyFish API key missing. Configure TINYFISH_API_KEY in .env or the Settings modal.'}).encode('utf-8'))
                return

            req = urllib.request.Request(
                'https://agent.tinyfish.ai/v1/automation/run',
                data=post_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-API-Key': api_key
                },
                method='POST'
            )

            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(__file__)
    if web_dir:
        os.chdir(web_dir)
        
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SearchiiHandler) as httpd:
        print(f"==================================================")
        print(f" Searchii Web App running at: http://localhost:{PORT}")
        print(f" Press Ctrl+C to stop.")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
