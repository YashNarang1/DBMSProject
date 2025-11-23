// dashboard.js — fetch + CRUD + UI wiring
const API = 'http://localhost:3030'
let STATE = { user: null, items: [], editing: null }

function $(s){ return document.querySelector(s) }
function qs(s){ return Array.from(document.querySelectorAll(s)) }

async function init(){
  // dark mode
  const body = document.body
  const themeBtn = $('#darkToggle')
  const savedTheme = localStorage.getItem('theme') || 'dark'
  body.setAttribute('data-theme', savedTheme)
  themeBtn.textContent = savedTheme === 'dark' ? 'Light' : 'Dark'
  themeBtn.addEventListener('click', () => {
    const current = body.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    body.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    themeBtn.textContent = next === 'dark' ? 'Light' : 'Dark'
  })

  // load session
  const saved = localStorage.getItem('inv_user')
  if (!saved){ window.location.href = 'index.html'; return }
  STATE.user = JSON.parse(saved)
  $('#accountInfo').textContent = 'Logged in as ' + (STATE.user.username || STATE.user.id)
  $('#logoutBtn').addEventListener('click', logout)

  // wire buttons
  $('#addBtn').addEventListener('click', addItem)
  $('#clearBtn').addEventListener('click', ()=>{ $('#add_name').value='';$('#add_desc').value='';$('#add_price').value='' })
  $('#search').addEventListener('input', renderList)
  $('#priceFilter').addEventListener('change', renderList)

  $('#editCancel').addEventListener('click', ()=>closeModal())
  $('#editSave').addEventListener('click', saveEdit)

  await fetchItems()
}

function setLoading(v){ $('#loading').style.display = v ? 'inline-block' : 'none' }

async function fetchItems(){
  setLoading(true)
  try{
    const res = await fetch(API + '/dashboard', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userid: STATE.user.id })
    })
    const data = await res.json()
    // expect array of items: [{id,itemname,description,price}]
    // adapt older formats too:
    let items = []
    if (Array.isArray(data)){
      // cases: directly items array OR mysql2 [rows,fields]
      if (data.length && data[0] && data[0].length && data[0][0].itemname){
        items = data[0]
      } else if (data.length && data[0] && data[0].itemname){
        items = data
      } else {
        // fallback try to map
        items = data.map(d => ({ id: d.id || d.itemid || d.ID, itemname: d.itemname || d.name, description: d.description || '', price: d.price || 0 }))
      }
    } else if (data && data.items) items = data.items

    STATE.items = items.map(it => ({ id: it.id, itemname: it.itemname, description: it.description, price: it.price }))
    renderList()
  }catch(e){
    console.error(e); alert('Could not fetch items — check server')
  } finally { setLoading(false) }
}

function renderList(){
  const q = $('#search').value.trim().toLowerCase()
  const priceFilter = $('#priceFilter').value
  let items = STATE.items.slice()

  // filter
  if (priceFilter !== 'all'){
    items = items.filter(it => {
      const p = Number(it.price || 0)
      if (priceFilter === 'low') return p < 100
      if (priceFilter === 'mid') return p >=100 && p <=500
      return p > 500
    })
  }

  if (q) items = items.filter(it => (it.itemname||'').toLowerCase().includes(q) || (it.description||'').toLowerCase().includes(q))

  $('#totalCount').textContent = items.length

  const container = $('#list')
  container.innerHTML = ''
  if (items.length === 0){ container.innerHTML = '<div class="muted">No items — add one.</div>'; return }

  items.forEach(it => {
    const div = document.createElement('div'); div.className='item'
    div.innerHTML = `
      <div>
        <h4>${escapeHtml(it.itemname)}</h4>
        <div class="muted small">${escapeHtml(it.description)}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">₹ ${it.price}</div>
        <div class="pills" style="margin-top:8px">
          <button class="pill edit" data-id="${it.id}">Edit</button>
          <button class="pill delete" data-id="${it.id}">Delete</button>
        </div>
      </div>
    `
    container.appendChild(div)
  })

  qs('.pill.edit').forEach(b => b.onclick = e => { const id = e.currentTarget.dataset.id; openEdit(id) })
  qs('.pill.delete').forEach(b => b.onclick = e => { const id = e.currentTarget.dataset.id; deleteItem(id) })
}

function escapeHtml(s=''){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

async function addItem(){
  const name = $('#add_name').value.trim()
  if (!name) return alert('Name required')
  const description = $('#add_desc').value.trim()
  const price = Number($('#add_price').value || 0)

  setLoading(true)
  try{
    const res = await fetch(API + '/additem', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userid: STATE.user.id, itemname: name, description, price })
    })
    const data = await res.json()
    await fetchItems()
    $('#add_name').value='';$('#add_desc').value='';$('#add_price').value=''
  }catch(e){ console.error(e); alert('Add failed') } finally { setLoading(false) }
}

async function deleteItem(id){
  if (!confirm('Delete this item?')) return
  setLoading(true)
  try{
    await fetch(API + '/deleteitem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    await fetchItems()
  }catch(e){ console.error(e); alert('Delete failed') } finally { setLoading(false) }
}

async function openEdit(id){
  const item = STATE.items.find(x=>String(x.id)===String(id))
  if (!item) return
  STATE.editing = item
  $('#edit_name').value = item.itemname
  $('#edit_desc').value = item.description
  $('#edit_price').value = item.price
  $('#modal').classList.remove('hidden'); $('#modal').setAttribute('aria-hidden','false')
}

function closeModal(){
  $('#modal').classList.add('hidden'); $('#modal').setAttribute('aria-hidden','true'); STATE.editing = null
}

async function saveEdit(){
  if (!STATE.editing) return closeModal()
  const id = STATE.editing.id
  const itemname = $('#edit_name').value.trim()
  const description = $('#edit_desc').value.trim()
  const price = Number($('#edit_price').value || 0)
  setLoading(true)
  try{
    await fetch(API + '/updateitem', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, itemname, description, price })})
    await fetchItems()
    closeModal()
  }catch(e){ console.error(e); alert('Update failed') } finally { setLoading(false) }
}

function logout(){ localStorage.removeItem('inv_user'); window.location.href = 'index.html' }

// init
window.addEventListener('DOMContentLoaded', init)
