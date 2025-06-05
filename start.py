#Use to create local host
import http.server
import socketserver

PORT = 1337



Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
      ".js": "application/javascript",
});
'''
httpd = socketserver.TCPServer(("", PORT), Handler)
httpd.serve_forever()
'''
with http.server.HTTPServer(("0.0.0.0", PORT), Handler) as server:
   print("Running on port", PORT)
   server.serve_forever()
