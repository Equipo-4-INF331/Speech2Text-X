import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const {PGUSER, PGPASSWORD, PGHOST, PGDATABASE} = process.env;

console.log(PGUSER)

export const db = postgres(`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`);
