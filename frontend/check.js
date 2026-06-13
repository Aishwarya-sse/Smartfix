const fs = require('fs');
const content = fs.readFileSync('src/screens/PartnerHomeScreen.js', 'utf8');

let stack = [];
let line = 1;

for(let i=0; i<content.length; i++) {
  const c = content[i];
  if(c === '\n') line++;
  
  if(c === '"' || c === "'" || c === '`') {
    const quote = c;
    i++;
    while(i < content.length && content[i] !== quote) {
      if(content[i] === '\\') i++;
      if(content[i] === '\n') line++;
      i++;
    }
    continue;
  }
  
  if(c === '/' && content[i+1] === '/') {
    while(i < content.length && content[i] !== '\n') i++;
    line++;
    continue;
  }
  if(c === '/' && content[i+1] === '*') {
    i += 2;
    while(i < content.length && !(content[i] === '*' && content[i+1] === '/')) {
      if(content[i] === '\n') line++;
      i++;
    }
    i++;
    continue;
  }

  if(c === '{' || c === '(' || c === '[') {
    stack.push({c, line});
  } else if(c === '}' || c === ')' || c === ']') {
    const expected = c === '}' ? '{' : c === ')' ? '(' : '[';
    if(stack.length === 0 || stack[stack.length-1].c !== expected) {
      console.log('Mismatched', c, 'at line', line, 'expected', expected);
      break;
    }
    stack.pop();
  }
}

console.log('Remaining stack:', stack.map(s => s.c + ':' + s.line));
