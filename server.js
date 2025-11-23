
const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const db = require('./db')

const app = express()
app.use(cors())
app.use(express.json())


// Helper to run queries
async function q(sql, params){ const [rows] = await db.query(sql, params); return rows }

// --- AUTH ---
app.post('/login', async (req,res) => {
  try{
    const { username, password } = req.body
    // simple demo user
    if (username === 'demo' && password === 'demo'){
      return res.json({ success:true, user: { id: 1, username: 'demo' } })
    }
    const rows = await q('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password])
    if (rows.length === 0) return res.json({ success:false, message:'invalid' })
    res.json({ success:true, user: rows[0] })
  }catch(e){ console.error(e); res.status(500).json({ success:false, error: e.message }) }
})

// --- DASHBOARD: return items for user (id, itemname, description, price) ---
app.post('/dashboard', async (req,res) => {
  try{
    const { userid } = req.body
    // join userinventory + items to return full item rows
    const rows = await q(
      `SELECT it.id, it.itemname, it.description, it.price
       FROM userinventory ui
       JOIN items it ON ui.itemid = it.id
       WHERE ui.userid = ?`, [userid]
    )
    res.json(rows)
  }catch(e){ console.error(e); res.status(500).json({ error: e.message }) }
})

// --- ADD ITEM (inserts item, links userinventory) ---
app.post('/additem', async (req,res) => {
  try{
    const { userid, itemname, description, price } = req.body
    const r = await q('INSERT INTO items (itemname, description, price) VALUES (?, ?, ?)', [itemname, description, price || 0])
    const insertId = r.insertId
    await q('INSERT INTO userinventory (userid, itemid) VALUES (?, ?)', [userid, insertId])
    res.json({ success:true, id: insertId })
  }catch(e){ console.error(e); res.status(500).json({ success:false, error: e.message }) }
})

// --- UPDATE ITEM ---
app.post('/updateitem', async (req,res) => {
  try{
    const { id, itemname, description, price } = req.body
    await q('UPDATE items SET itemname = ?, description = ?, price = ? WHERE id = ?', [itemname, description, price || 0, id])
    res.json({ success:true })
  }catch(e){ console.error(e); res.status(500).json({ success:false, error: e.message }) }
})

// --- DELETE ITEM (remove from userinventory then items) ---
app.post('/deleteitem', async (req,res) => {
  try{
    const { id } = req.body
    // remove referencing rows first
    await q('DELETE FROM userinventory WHERE itemid = ?', [id])
    await q('DELETE FROM items WHERE id = ?', [id])
    res.json({ success:true })
  }catch(e){ console.error(e); res.status(500).json({ success:false, error: e.message }) }
})

app.listen(3030, () => console.log('Server started on http://localhost:3030'))