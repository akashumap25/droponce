import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '🛡️  Running DROPONCE Pre-Flight Security Audit...\n');

let issues = 0;

// 1. Check for secret leaks in client env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dangerousPatterns = [
    /VITE_.*SERVICE_ROLE/i,
    /VITE_.*SECRET/i,
    /VITE_.*R2_SECRET/i,
    /VITE_.*PRIVATE/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(envContent)) {
      console.error('\x1b[31m%s\x1b[0m', '❌ CRITICAL: Sensitive secret key leaked into VITE_ client environment variable!');
      issues++;
    }
  }
}

// 2. Check robots.txt exists and disallows /s/
const robotsPath = path.join(rootDir, 'public', 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const content = fs.readFileSync(robotsPath, 'utf8');
  if (content.includes('Disallow: /s/')) {
    console.log('\x1b[32m%s\x1b[0m', '✅ robots.txt properly blocks search engine indexing of temporary /s/ links');
  } else {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  Warning: robots.txt does not block /s/ links');
    issues++;
  }
} else {
  console.error('\x1b[31m%s\x1b[0m', '❌ Missing public/robots.txt');
  issues++;
}

// 3. Check vercel.json security headers
const vercelPath = path.join(rootDir, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const content = fs.readFileSync(vercelPath, 'utf8');
  if (content.includes('X-Frame-Options') && content.includes('no-store')) {
    console.log('\x1b[32m%s\x1b[0m', '✅ vercel.json includes strict security headers & anti-caching rules');
  } else {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  vercel.json missing essential security headers');
    issues++;
  }
}

// 4. Verify Edge function token hashing
const schemaPath = path.join(rootDir, 'supabase', 'migrations', '20260910000000_create_files_schema.sql');
if (fs.existsSync(schemaPath)) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  if (sql.includes('token_hash') && sql.includes('SECURITY DEFINER') && sql.includes('SET search_path = public')) {
    console.log('\x1b[32m%s\x1b[0m', '✅ Database schema enforces token hashing & hardened search_path');
  } else {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  Database schema could be further hardened');
    issues++;
  }
}

console.log('\n----------------------------------------');
if (issues === 0) {
  console.log('\x1b[32m%s\x1b[0m', '🎉 All security checks passed! Ready for production deployment.');
} else {
  console.log('\x1b[31m%s\x1b[0m', `⚠️  Found ${issues} item(s) that require attention before launch.`);
}
console.log('----------------------------------------\n');
