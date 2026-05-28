import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const pkgPath = resolve('./package.json');
const jsrPath = resolve('./jsr.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const jsr = JSON.parse(readFileSync(jsrPath, 'utf-8'));

jsr.version = pkg.version;

writeFileSync(jsrPath, JSON.stringify(jsr, null, 2) + '\n');

console.log(`Synced version to ${pkg.version}`);
