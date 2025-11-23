// login.js — handles login flow
const API = 'http://localhost:3030'

document.getElementById('loginBtn').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim()
  const p = document.getElementById('password').value
  await doLogin(u,p)
})

document.getElementById('demoBtn').addEventListener('click', async () => {
  document.getElementById('username').value = 'demo'
  document.getElementById('password').value = 'demo'
  await doLogin('demo','demo')
})

async function doLogin(username,password){
  const err = document.getElementById('error'); err.textContent = ''
  try{
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    // adaptable parsing
    // Prefer: { success:true, user: { id, username } }
    if (data && data.success && data.user){
      localStorage.setItem('inv_user', JSON.stringify(data.user))
      window.location.href = 'dashboard.html'
      return
    }
    // older format: mysql2 returns [rows, fields]
    if (Array.isArray(data) && data[0] && data[0].length){
      const user = data[0][0]
      localStorage.setItem('inv_user', JSON.stringify(user))
      window.location.href = 'dashboard.html'
      return
    }
    err.textContent = 'Invalid credentials'
  }catch(e){
    console.error(e)
    err.textContent = 'Login failed — start your server and check console'
  }
}