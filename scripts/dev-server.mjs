/**
 * 零依赖静态文件服务器 —— 仅供本地开发使用。
 *
 * 为什么需要它？
 * 前端用了 ES Module（`<script type="module">`），浏览器出于安全考虑
 * 禁止通过 file:// 协议加载模块，直接双击 index.html 会报 CORS 错误。
 * 因此本地开发必须有一个 HTTP 服务来托管静态文件。
 *
 * 为什么不用 `npx serve` 或 Live Server？
 * 本项目的作业要求里有「技术要合理、不要不必要地依赖本地环境」这一条。
 * 这个脚本只用 Node 内置模块，克隆下来就能跑，不需要联网装任何东西，
 * 助教验收时也不会因为下载超时而卡住。
 *
 * 用法：node scripts/dev-server.mjs [端口]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const documentRoot = path.join(projectRoot, 'src');
const port = Number(process.argv[2]) || 5500;
const host = '127.0.0.1';

/** 扩展名到 MIME 类型的映射。只列本项目会用到的几种。 */
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
  // 只解析路径部分，忽略查询字符串（?api=... 这类参数不需要参与文件查找）。
  const requestPath = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.join(documentRoot, relativePath);

  // 目录穿越防护：把解析后的绝对路径与文档根目录比对，
  // 防止请求 /../../etc/passwd 之类的路径读到项目外部的文件。
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
      // 开发阶段禁用缓存，改完代码刷新就能看到效果。
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(normalizedFile).pipe(response);
  });
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log('前端开发服务器已启动');
  console.log(`  页面地址: ${url}`);
  console.log(`  静态根目录: ${documentRoot}`);
  console.log('');
  console.log('请确认后端已在 5000 端口运行（cd calculator_backend && npm start）。');
  console.log('按 Ctrl+C 停止。');
});
