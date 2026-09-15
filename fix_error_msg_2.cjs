const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

const regex4 = /if \(errorStr\.includes\('403'\) \|\| errorStr\.includes\('PERMISSION_DENIED'\)\) \{[\s\S]*?\}/;
code = code.replace(regex4, "");

fs.writeFileSync('services/geminiService.ts', code);
