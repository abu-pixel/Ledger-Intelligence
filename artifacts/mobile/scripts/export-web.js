const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'static-build');

// Never publish stale native manifests in place of the browser app.
fs.rmSync(outputDir, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'export', '--clear', '--platform', 'web', '--output-dir', 'static-build'],
  { cwd: projectRoot, stdio: 'inherit' },
);

if (result.error || result.status !== 0) {
  console.error('Unable to export the Expo browser app.');
  process.exit(result.status || 1);
}

const indexPath = path.join(outputDir, 'index.html');
if (!fs.existsSync(indexPath) || fs.statSync(indexPath).size === 0) {
  console.error('Web export is missing static-build/index.html; refusing to publish.');
  process.exit(1);
}

// Refuse to publish an old export containing the removed account screens or SDKs.
const removedAuthMarkers = [
  '@clerk/',
  'netlify-identity-widget',
  '@netlify/identity',
  './(auth)/sign-in',
  './(auth)/sign-up',
];
function verifyAccountFreeExport(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      verifyAccountFreeExport(filename);
    } else if (/\.(?:js|html)$/.test(entry.name)) {
      const contents = fs.readFileSync(filename, 'utf8');
      if (removedAuthMarkers.some(marker => contents.includes(marker))) {
        console.error('Web export contains removed authentication code; refusing to publish.');
        process.exit(1);
      }
    }
  }
}
verifyAccountFreeExport(outputDir);

// Keep direct links working even when the output is published without netlify.toml.
const legacyAccountRoutes = [
  '/sign-in', '/sign-up', '/login', '/signup',
  '/sign-in/*', '/sign-up/*', '/login/*', '/signup/*',
  '/signin', '/signin/*', '/signout', '/signout/*', '/logout', '/logout/*',
  '/auth', '/auth/*', '/(auth)', '/(auth)/*', '/sso-callback', '/forgot-password', '/reset-password',
];
const redirects = legacyAccountRoutes.map(route => `${route}    /    302!`);
redirects.push('/*    /index.html   200');
fs.writeFileSync(path.join(outputDir, '_redirects'), `${redirects.join('\n')}\n`);

// Also revalidate the app shell when deploying the export directory directly.
fs.writeFileSync(path.join(outputDir, '_headers'), '/*\n  Cache-Control: no-cache\n');
