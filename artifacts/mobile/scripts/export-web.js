const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'static-build');

// Never publish stale native manifests in place of the browser app.
fs.rmSync(outputDir, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'static-build'],
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

// Keep direct links working even when the output is published without netlify.toml.
fs.writeFileSync(path.join(outputDir, '_redirects'), '/*    /index.html   200\n');
