const { execSync } = require('child_process');
const fs = require('fs');
let out = '';
try { out += '=== REMOTE ===\n' + execSync('git --no-pager remote -v', { encoding: 'utf8', cwd: 'F:/Edeviser-Kiro' }); } catch (e) { out += 'REMOTE_ERR ' + e.message + '\n'; }
try { out += '=== LOG ===\n' + execSync('git --no-pager log --oneline -8', { encoding: 'utf8', cwd: 'F:/Edeviser-Kiro' }); } catch (e) { out += 'LOG_ERR ' + e.message + '\n'; }
try { out += '=== GH AUTH ===\n' + execSync('gh auth status', { encoding: 'utf8', cwd: 'F:/Edeviser-Kiro' }); } catch (e) { out += 'GH_AUTH_ERR ' + e.message + '\n'; }
fs.writeFileSync('F:/Edeviser-Kiro/diag-out.txt', out);
console.log('WROTE diag-out.txt');
