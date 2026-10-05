/**
 * Zero-dependency static file server — for local development only.
 *
 * Why is it needed?
 * The frontend uses ES Modules (`<script type="module">`), and for security reasons the browser
 * forbids loading modules over the file:// protocol, so double-clicking index.html directly raises a CORS error.
 * Local development therefore requires an HTTP service to host the static files.
 *
 * Why not use `npx serve` or Live Server?
 * The assignment requirements for this project include the item "the technology must be reasonable; do not depend on the local environment unnecessarily".
 * This script uses only Node built-in modules, so it runs as soon as the repository is cloned, without installing anything over the network,
 * and grading by the teaching assistant will not stall on a download timeout.
 *
 * Usage: node scripts/dev-server.mjs [port]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const documentRoot = path.join(projectRoot, 'src');
const port = Number(process.argv[2]) || 5500;
const host = '127.0.0.1';

/** Mapping from file extension to MIME type. Only the few this project uses are listed. */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((request, response) => {
  // Parse only the path part and ignore the query string (parameters such as ?api=... do not take part in file lookup).
  const requestPath = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.join(documentRoot, relativePath);

  // Directory traversal protection: compare the resolved absolute path against the document root,
  // preventing a request such as /../../etc/passwd from reading files outside the project.
  const normalizedRoot = path.resolve(documentRoot);
  const normalizedFile = path.resolve(filePath);
  if (normalizedFile !== normalizedRoot && !normalizedFile.startsWith(normalizedRoot + path.sep)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('403 Forbidden');
    return;
  }

  fs.stat(normalizedFile, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('404 Not Found');
      return;
    }

    const extension = path.extname(normalizedFile).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
      // Disable caching during development, so a refresh after a code change shows the effect immediately.
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(normalizedFile).pipe(response);
  });
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log('Frontend development server started');
  console.log(`  Page URL: ${url}`);
  console.log(`  Static root: ${documentRoot}`);
  console.log('');
  console.log('Make sure the backend is running on port 5000 (cd calculator_backend && npm start).');
  console.log('Press Ctrl+C to stop.');
});
