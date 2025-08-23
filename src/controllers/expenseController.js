import { pool } from '../config/db.js';

export async function createHousehold(req, res){
  const { name } = req.body;
  if(!name) return res.status(400).json({error:'Name required'});
  const conn = await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [h] = await conn.query('INSERT INTO households (name) VALUES (?)', [name]);
    await conn.query('INSERT INTO user_households (user_id, household_id) VALUES (?,?)', [req.user.id, h.insertId]);
    await conn.commit();
    res.json({ id: h.insertId, name });
  }catch(e){
    await conn.rollback();
    res.status(500).json({error:'Failed to create household'});
  }finally{
    conn.release();
  }
}

export async function joinHousehold(req, res){
  const { householdId } = req.body;
  if(!householdId) return res.status(400).json({error:'householdId required'});
  try{
    await pool.query('INSERT IGNORE INTO user_households (user_id, household_id) VALUES (?,?)', [req.user.id, householdId]);
    res.json({ joined: true, householdId });
  }catch(e){
    res.status(500).json({error:'Failed to join household'});
  }
}

export async function listHouseholds(req, res){
  const [rows] = await pool.query(
    `SELECT h.id, h.name, h.created_at
     FROM households h
     JOIN user_households uh ON uh.household_id = h.id
     WHERE uh.user_id = ?`,
    [req.user.id]
  );
  res.json(rows);
}

export async function addExpense(req, res){
  const { household_id, amount, description, category, date } = req.body;
  if(!household_id || !amount) return res.status(400).json({error:'household_id and amount required'});
  const d = date ? new Date(date) : new Date();
  try{
    const [result] = await pool.query(
      `INSERT INTO expenses (household_id, paid_by, amount, description, category, date)
       VALUES (?,?,?,?,?,?)`,
      [household_id, req.user.id, amount, description || null, category || null, d]
    );
    const [row] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
    res.json(row[0]);
  }catch(e){
    res.status(500).json({error:'Failed to add expense'});
  }
}

export async function listExpenses(req, res){
  const { household_id, month, year } = req.query;
  if(!household_id) return res.status(400).json({error:'household_id required'});
  let where = 'WHERE e.household_id = ?';
  const params = [household_id];
  if(month && year){
    where += ' AND MONTH(e.date) = ? AND YEAR(e.date) = ?';
    params.push(month, year);
  }
  const [rows] = await pool.query(
    `SELECT e.*, u.name as payer_name
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     ${where}
     ORDER BY e.date DESC`,
    params
  );
  res.json(rows);
}

export async function summary(req, res){
  const { household_id, month, year } = req.query;
  if(!household_id) return res.status(400).json({error:'household_id required'});
  const [members] = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN user_households uh ON uh.user_id = u.id
     WHERE uh.household_id = ?`,
    [household_id]
  );
  if(!members.length) return res.json({ members: [], balances: [], settlements: [] });
  const balances = {};
  members.forEach(m => balances[m.id] = { user: m, paid: 0, owed: 0, net: 0 });

  let where = 'WHERE e.household_id = ?';
  const params = [household_id];
  if(month && year){
    where += ' AND MONTH(e.date) = ? AND YEAR(e.date) = ?';
    params.push(month, year);
  }
  const [expenses] = await pool.query(`SELECT * FROM expenses e ${where}`, params);
  const n = members.length;
  for(const e of expenses){
    balances[e.paid_by].paid += Number(e.amount);
    const share = Number(e.amount) / n;
    for(const m of members){
      balances[m.id].owed += share;
    }
  }
  for(const id of Object.keys(balances)){
    balances[id].net = round2(balances[id].paid - balances[id].owed);
    balances[id].paid = round2(balances[id].paid);
    balances[id].owed = round2(balances[id].owed);
  }
  const settlements = computeSettlements(Object.values(balances));
  res.json({ members, expensesCount: expenses.length, balances: Object.values(balances), settlements });
}

function round2(n){ return Math.round(n * 100) / 100; }

function computeSettlements(balances){
  const creditors = [];
  const debtors = [];
  for(const b of balances){
    if(b.net > 0.009) creditors.push({ ...b });
    else if(b.net < -0.009) debtors.push({ ...b });
  }
  creditors.sort((a,b)=>b.net - a.net);
  debtors.sort((a,b)=>a.net - b.net);
  const txns = [];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const pay = Math.min(-debtors[i].net, creditors[j].net);
    txns.push({
      from: { id: debtors[i].user.id, name: debtors[i].user.name },
      to: { id: creditors[j].user.id, name: creditors[j].user.name },
      amount: round2(pay)
    });
    debtors[i].net = round2(debtors[i].net + pay);
    creditors[j].net = round2(creditors[j].net - pay);
    if(Math.abs(debtors[i].net) < 0.01) i++;
    if(Math.abs(creditors[j].net) < 0.01) j++;
  }
  return txns;
}