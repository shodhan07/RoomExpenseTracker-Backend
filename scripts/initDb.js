import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run(){
  try{
    const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database initialized.');
    process.exit(0);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
}
run();