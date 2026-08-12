const fs = require('fs');
['js/mindmap.js', 'js/pyq.js', 'js/app.js'].forEach(f => {
    let s = fs.readFileSync(f, 'utf8');
    s = s.replace(/\\`/g, '`');
    s = s.replace(/\\\${/g, '${');
    s = s.replace(/\\'/g, "'");
    fs.writeFileSync(f, s);
});
console.log('Fixed escaping in files.');
