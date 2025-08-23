import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const signToken = (user) => jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

export async function register(req, res){
  const { name, email, password } = req.body;
  if(!name || !email || !password) return res.status(400).json({error:'Missing fields'});
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if(rows.length) return res.status(409).json({error:'Email already in use'});
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)', [name, email, hash]);
  const [userRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [result.insertId]);
  const token = signToken(userRows[0]);
  res.json({ token, user: userRows[0] });
}

export async function login(req, res){
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({error:'Missing fields'});
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if(!rows.length) return res.status(401).json({error:'Invalid credentials'});
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({error:'Invalid credentials'});
  const token = signToken(user);
  res.json({ token, user: { id:user.id, name:user.name, email:user.email } });
}

export async function me(req, res){
  const [rows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
  res.json(rows[0]);
}