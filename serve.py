import http.server
import socketserver
import os

PORT = 3000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle clean URLs (e.g. /pricing -> /pricing.html)
        if self.path != '/' and not '.' in self.path:
            possible_html = self.path + '.html'
            if os.path.exists(self.translate_path(possible_html)):
                self.path = possible_html

        # Check if the requested path exists
        if not os.path.exists(self.translate_path(self.path)):
            # Serve 404.html instead of default python 404
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            
            error_page = self.translate_path('/404.html')
            if os.path.exists(error_page):
                with open(error_page, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"404 Not Found")
            return

        return super().do_GET()

with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
