#!/usr/bin/env python3
"""Minimal backend server for WaveSight - works without external dependencies"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
from datetime import datetime

class APIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers(200)
    
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Health check
        if path == '/health':
            self._set_headers()
            self.wfile.write(json.dumps({'status': 'healthy'}).encode())
            return
        
        # Root endpoint
        if path == '/':
            self._set_headers()
            response = {
                'message': 'WaveSight API',
                'status': 'operational',
                'endpoints': {
                    'health': '/health',
                    'performance_stats': '/api/v1/performance/stats',
                    'earnings': '/api/v1/performance/earnings/breakdown',
                    'submit_trend': '/api/v1/performance/submit'
                }
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Performance stats
        if path == '/api/v1/performance/stats':
            self._set_headers()
            stats = {
                'total_earnings': 1250.75,
                'pending_earnings': 125.50,
                'trends_spotted': 42,
                'accuracy_score': 0.87,
                'validation_score': 0.92,
                'weekly_stats': {
                    'earnings': 250.25,
                    'trends': 8,
                    'validations': 15
                }
            }
            self.wfile.write(json.dumps(stats).encode())
            return
        
        # Earnings breakdown
        if path == '/api/v1/performance/earnings/breakdown':
            self._set_headers()
            earnings = {
                'total': 1250.75,
                'pending': 125.50,
                'available': 1125.25,
                'breakdown': [
                    {
                        'trend_id': '1',
                        'trend_name': 'AI Avatars',
                        'amount': 50.25,
                        'date': '2024-01-15',
                        'status': 'paid'
                    },
                    {
                        'trend_id': '2',
                        'trend_name': 'Silent Walking',
                        'amount': 75.50,
                        'date': '2024-01-14',
                        'status': 'paid'
                    }
                ]
            }
            self.wfile.write(json.dumps(earnings).encode())
            return
        
        # Default 404
        self._set_headers(404)
        self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Submit trend
        if path == '/api/v1/performance/submit':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode())
                response = {
                    'success': True,
                    'trend_id': 'trend_' + str(hash(data.get('trend_name', '')) % 10000),
                    'message': 'Trend submitted successfully',
                    'estimated_earnings': 25.50
                }
                self._set_headers()
                self.wfile.write(json.dumps(response).encode())
            except:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': 'Invalid request'}).encode())
            return
        
        # Default 404
        self._set_headers(404)
        self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

def run_server(port=8001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, APIHandler)
    print(f"WaveSight API Server running on http://localhost:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()