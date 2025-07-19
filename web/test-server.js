const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working on port 3001\n');
});

server.listen(3001, '127.0.0.1', () => {
  console.log('Test server running at http://127.0.0.1:3001/');
});

setTimeout(() => {
  console.log('Test completed. Server would be accessible at http://localhost:3001');
  process.exit(0);
}, 2000);