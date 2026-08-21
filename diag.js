const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const NL = String.fromCharCode(10);
let out = '';
try { out += '=== REMOTE ===' + NL + execSync('git --no-pager remote -v', { encoding: 'utf8', cwd: repoRoot }); } catch (e) { out += 'REMOTE_ERR ' + e.message + NL; }
try { out += '=== LOG ===' + NL + execSync('git --no-pager log --oneline -8', { encoding: 'utf8', cwd: repoRoot }); } catch (e) { out += 'LOG_ERR ' + e.message + NL; }
try { out += '=== GH AUTH ===' + NL + execSync('gh auth status', { encoding: 'utf8', cwd: repoRoot }); } catch (e) { out += 'GH_AUTH_ERR ' + e.message + NL; }
fs.writeFileSync(path.join(repoRoot, 'diag-out.txt'), out);
console.log('WROTE diag-out.txt');