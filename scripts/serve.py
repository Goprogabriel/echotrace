#!/usr/bin/env python3
"""Alternative zero-dependency static launcher. Does not receive or process media."""
import functools
import http.server
import os
import pathlib
import sys
import webbrowser
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'dist'
PORT = int(os.environ.get('PORT', '4173'))
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.json': 'application/json'}
    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()
if not (ROOT / 'index.html').exists():
    sys.exit('The built dist/ folder is missing.')
with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Handler, directory=str(ROOT))) as server:
    print(f'\nECHOTRACE — http://127.0.0.1:{PORT}\nLocal static files only. Ctrl+C stops the server.\n')
    if '--open' in sys.argv:
        webbrowser.open(f'http://127.0.0.1:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
