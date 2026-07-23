require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.MYSQL_PASSWORD,
  database: 'login_demo'
});
db.connect((err) => { if (err) throw err; console.log('Connected to login_demo'); });

db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(100),
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'student'
  )
`);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"Uni App" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Login OTP',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f9fb;border-radius:12px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Login Verification</h2>
        <p style="color:#555;margin-bottom:24px;">Your OTP expires in <b>5 minutes</b>.</p>
        <div style="background:#fff;border:2px solid #e8eaf0;border-radius:8px;padding:24px;text-align:center;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a2e;">${otp}</span>
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you did not request this, ignore this email.</p>
      </div>`
  });
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#f0f2f8;min-height:100vh;display:flex;flex-direction:column;}
  header{background:#1a1a2e;padding:16px 32px;display:flex;align-items:center;gap:12px;}
  header .logo{width:36px;height:36px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:16px;}
  header h1{color:white;font-size:18px;font-weight:600;}
  header span{color:#8b8fa8;font-size:14px;margin-left:auto;}
  nav{background:#16213e;padding:0 32px;display:flex;gap:4px;}
  nav a{color:#8b8fa8;text-decoration:none;font-size:14px;font-weight:500;padding:12px 16px;border-bottom:2px solid transparent;transition:all 0.2s;}
  nav a:hover{color:white;border-bottom-color:#4f46e5;}
  .page{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 16px;}
  .card{background:white;border-radius:16px;padding:40px;width:100%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .card-wide{max-width:680px;}
  .card-header{margin-bottom:28px;}
  .card-header .step{font-size:12px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
  .card-header h2{font-size:22px;font-weight:700;color:#1a1a2e;margin-bottom:6px;}
  .card-header p{font-size:14px;color:#6b7280;line-height:1.5;}
  label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;margin-top:16px;}
  input[type="text"],input[type="password"],input[type="email"]{width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;color:#1a1a2e;transition:border-color 0.2s;outline:none;}
  input:focus{border-color:#4f46e5;}
  .otp-input{font-size:28px;font-weight:700;letter-spacing:12px;text-align:center;padding:16px;}
  .btn{display:block;width:100%;padding:12px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;margin-top:24px;transition:background 0.2s;text-align:center;text-decoration:none;}
  .btn:hover{background:#4338ca;}
  .btn-ghost{background:transparent;color:#4f46e5;border:1.5px solid #4f46e5;}
  .btn-ghost:hover{background:#f0f0ff;}
  .msg{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px;}
  .msg-error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
  .msg-success{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;}
  .msg-info{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;}
  .link-row{text-align:center;margin-top:20px;font-size:13px;color:#6b7280;}
  .link-row a{color:#4f46e5;text-decoration:none;font-weight:500;}
  .link-row a:hover{text-decoration:underline;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px;}
  .stat{background:#f8f9fb;border-radius:12px;padding:20px;border:1px solid #e5e7eb;}
  .stat .lbl{font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;}
  .stat .val{font-size:16px;font-weight:700;color:#1a1a2e;}
  .search-row{display:flex;gap:8px;margin-top:20px;}
  .search-row input{flex:1;}
  .search-row .btn{width:auto;margin-top:0;padding:10px 20px;}
  table{width:100%;border-collapse:collapse;margin-top:20px;}
  th{background:#f8f9fb;padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;}
  td{padding:12px 14px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:#fafafa;}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:500;background:#ede9fe;color:#7c3aed;}
  .divider{margin:24px 0;border:none;border-top:1px solid #f3f4f6;}
`;

const layout = (title, body, loggedIn = false, username = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} — PES University Portal</title>
  <style>${styles}</style>
</head>
<body>
  <header>
    <div class="logo">P</div>
    <h1>PES University Portal</h1>
    ${loggedIn ? `<span>Signed in as ${username}</span>` : ''}
  </header>
  ${loggedIn ? `<nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/student-search">Search Students</a>
    <a href="/logout">Sign out</a>
  </nav>` : ''}
  <div class="page">${body}</div>
</body>
</html>`;

const suspiciousPatterns = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /\b(OR|AND)\b.+(=|>|<)/i,
  /\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i,
  /\bSLEEP\s*\(/i,/\bWAITFOR\s+DELAY\b/i,
  /['"]\s*OR\s*['"]1['"]=['"]1/i
];
function isSuspicious(i){return suspiciousPatterns.some(p=>p.test(i));}
function logAttempt(i,ip,ctx){fs.appendFileSync('logs.txt',`[${new Date().toISOString()}] [${ctx}] IP: ${ip} | Input: ${i}\n`);}
async function checkML(i){try{const r=await axios.post('http://localhost:5000/predict',{text:i});return r.data.result==='malicious';}catch{return false;}}
async function isMalicious(i,ip,ctx){const h=isSuspicious(i),ml=await checkML(i);if(h||ml){logAttempt(i,ip,ctx);return true;}return false;}

// Register
app.get('/register',(req,res)=>{
  res.send(layout('Register',`
    <div class="card">
      <div class="card-header">
        <div class="step">New Account</div>
        <h2>Create your account</h2>
        <p>Register to access the university portal.</p>
      </div>
      <form method="POST" action="/register">
        <label>Username</label>
        <input type="text" name="username" placeholder="e.g. varsha_123" required/>
        <label>Email</label>
        <input type="email" name="email" placeholder="your@email.com" required/>
        <label>Password</label>
        <input type="password" name="password" placeholder="Min. 6 characters" required/>
        <button class="btn" type="submit">Create account</button>
      </form>
      <div class="link-row">Already have an account? <a href="/">Sign in</a></div>
    </div>`));
});

app.post('/register',async(req,res)=>{
  const{username,email,password}=req.body;
  if(await isMalicious(`${username} ${email} ${password}`,req.ip,'REGISTER')){
    return res.send(layout('Register',`<div class="card"><div class="msg msg-error">Suspicious input detected. Registration blocked.</div><a href="/register" class="btn" style="margin-top:16px;">Try again</a></div>`));
  }
  db.execute(`INSERT INTO users (username,email,password) VALUES (?,?,?)`,[username,email,password],async(err)=>{
    if(err) return res.send(layout("Register",`<div class="card"><div class="msg msg-error">Username already exists.</div><a href="/register" class="btn" style="margin-top:16px;">Try again</a></div>`));
    const otp=generateOTP();otpStore[username]={otp,expiresAt:Date.now()+5*60*1000};req.session.pendingUser=username;
    try{await sendOTP(email,otp);}catch(e){return res.send(layout("Register",`<div class="card"><div class="msg msg-error">Account created but OTP failed. <a href="/">Sign in</a>.</div></div>`));}
    res.send(layout("Verify OTP",`
      <div class="card">
        <div class="card-header">
          <div class="step">Almost there</div>
          <h2>Verify your email</h2>
          <p>We sent a 6-digit code to your registered email. It expires in 5 minutes.</p>
        </div>
        <div class="msg msg-success">Account created! Check your inbox.</div>
        <form method="POST" action="/verify-otp">
          <label>Enter OTP</label>
          <input class="otp-input" type="text" name="otp" maxlength="6" placeholder="······" required autocomplete="one-time-code"/>
          <button class="btn" type="submit">Verify and sign in</button>
        </form>
        <div class="link-row"><a href="/">Back to login</a></div>
      </div>`));
  });
});

// Login
app.get('/',(req,res)=>{
  if(req.session.username) return res.redirect('/dashboard');
  res.send(layout('Sign in',`
    <div class="card">
      <div class="card-header">
        <div class="step">Step 1 of 2</div>
        <h2>Sign in</h2>
        <p>Enter your credentials. A one-time code will be sent to your registered email.</p>
      </div>
      <form method="POST" action="/login">
        <label>Username</label>
        <input type="text" name="username" placeholder="Your username" required/>
        <label>Password</label>
        <input type="password" name="password" placeholder="Your password" required/>
        <button class="btn" type="submit">Continue →</button>
      </form>
      <div class="link-row">No account? <a href="/register">Register here</a></div>
    </div>`));
});

app.post('/login',async(req,res)=>{
  const{username,password}=req.body;
  if(await isMalicious(`${username} ${password}`,req.ip,'LOGIN')){
    return res.send(layout('Sign in',`<div class="card"><div class="msg msg-error">Suspicious input detected. Access denied.</div><a href="/" class="btn" style="margin-top:16px;">Try again</a></div>`));
  }
  db.execute(`SELECT * FROM users WHERE username=? AND password=?`,[username,password],async(err,results)=>{
    if(err||results.length===0){
      return res.send(layout('Sign in',`<div class="card"><div class="msg msg-error">Invalid username or password.</div><a href="/" class="btn" style="margin-top:16px;">Try again</a></div>`));
    }
    const user=results[0];
    const otp=generateOTP();
    otpStore[user.username]={otp,expiresAt:Date.now()+5*60*1000};
    req.session.pendingUser=user.username;
    try{await sendOTP(user.email,otp);}
    catch(e){return res.send(layout('Sign in',`<div class="card"><div class="msg msg-error">Failed to send OTP. Check email config.</div><a href="/" class="btn" style="margin-top:16px;">Try again</a></div>`));}
    res.send(layout('Verify OTP',`
      <div class="card">
        <div class="card-header">
          <div class="step">Step 2 of 2</div>
          <h2>Check your email</h2>
          <p>We sent a 6-digit code to your registered email. It expires in 5 minutes.</p>
        </div>
        <div class="msg msg-info">OTP sent — check your inbox.</div>
        <form method="POST" action="/verify-otp">
          <label>Enter OTP</label>
          <input class="otp-input" type="text" name="otp" maxlength="6" placeholder="······" required autocomplete="one-time-code"/>
          <button class="btn" type="submit">Verify & sign in</button>
        </form>
        <div class="link-row"><a href="/">← Back to login</a></div>
      </div>`));
  });
});

app.post('/verify-otp',async(req,res)=>{
  const{otp}=req.body;
  if(!req.session.pendingUser) return res.redirect('/');
  if(isSuspicious(otp)){logAttempt(otp,req.ip,'OTP');return res.send(layout('Verify OTP',`<div class="card"><div class="msg msg-error">Invalid input.</div><a href="/" class="btn" style="margin-top:16px;">Start again</a></div>`));}
  const username=req.session.pendingUser;
  const record=otpStore[username];
  if(!record||Date.now()>record.expiresAt){
    delete otpStore[username];
    return res.send(layout('Verify OTP',`<div class="card"><div class="msg msg-error">OTP expired. Please sign in again.</div><a href="/" class="btn" style="margin-top:16px;">Sign in again</a></div>`));
  }
  if(otp!==record.otp){
    return res.send(layout('Verify OTP',`
      <div class="card">
        <div class="card-header"><div class="step">Step 2 of 2</div><h2>Incorrect code</h2><p>The code didn't match. Try again.</p></div>
        <div class="msg msg-error">Incorrect OTP.</div>
        <form method="POST" action="/verify-otp">
          <label>Enter OTP</label>
          <input class="otp-input" type="text" name="otp" maxlength="6" placeholder="······" required autocomplete="one-time-code"/>
          <button class="btn" type="submit">Verify & sign in</button>
        </form>
      </div>`));
  }
  delete otpStore[username];
  req.session.username=username;
  delete req.session.pendingUser;
  res.redirect('/dashboard');
});

app.get('/dashboard',(req,res)=>{
  if(!req.session.username) return res.redirect('/');
  res.send(layout('Dashboard',`
    <div class="card card-wide">
      <div class="card-header">
        <h2>Dashboard</h2>
        <p>Your session is secured with password + email OTP verification.</p>
      </div>
      <div class="grid2">
        <div class="stat"><div class="lbl">Security Status</div><div class="val" style="color:#16a34a;">✓ Verified</div></div>
        <div class="stat"><div class="lbl">Auth Method</div><div class="val">Password + Email OTP</div></div>
      </div>
      <hr class="divider"/>
      <div class="card-header" style="margin-bottom:0;">
        <h2 style="font-size:18px;">Search Students</h2>
      </div>
      <form method="GET" action="/student-search">
        <div class="search-row">
          <input type="text" name="term" placeholder="Enter student name..."/>
          <button class="btn" type="submit">Search</button>
        </div>
      </form>
    </div>`,true,req.session.username));
});

app.get('/logout',(req,res)=>{req.session.destroy(()=>res.redirect('/'));});

app.get('/student-search',async(req,res)=>{
  if(!req.session.username) return res.redirect('/');
  const{term}=req.query;
  if(!term){
    return res.send(layout('Search Students',`
      <div class="card card-wide">
        <div class="card-header"><h2>Search Students</h2><p>Find student records by name.</p></div>
        <form method="GET"><div class="search-row"><input type="text" name="term" placeholder="Enter student name..."/><button class="btn" type="submit">Search</button></div></form>
      </div>`,true,req.session.username));
  }
  if(await isMalicious(term,req.ip,'STUDENT_SEARCH')){
    return res.send(layout('Search Students',`<div class="card card-wide"><div class="msg msg-error">Suspicious input detected. Request blocked and logged.</div><a href="/dashboard" class="btn" style="margin-top:16px;">Back to dashboard</a></div>`,true,req.session.username));
  }
  db.execute(`SELECT * FROM students WHERE name LIKE ?`,[`%${term}%`],(err,results)=>{
    if(err) return res.send(layout('Search',`<div class="card"><div class="msg msg-error">Database error.</div></div>`,true));
    const rows=results.length===0
      ?`<p style="color:#6b7280;margin-top:16px;">No students found for "<b>${term}</b>".</p>`
      :`<table><thead><tr><th>Name</th><th>Department</th><th>Marks</th><th>Role</th></tr></thead><tbody>
        ${results.map(r=>`<tr><td>${r.name}</td><td>${r.department}</td><td>${r.marks}</td><td><span class="badge">Student</span></td></tr>`).join('')}
        </tbody></table>`;
    res.send(layout('Search Results',`
      <div class="card card-wide">
        <div class="card-header"><h2>Search Results</h2><p>${results.length} result${results.length!==1?'s':''} for "<b>${term}</b>"</p></div>
        <form method="GET" action="/student-search"><div class="search-row"><input type="text" name="term" value="${term}"/><button class="btn" type="submit">Search</button></div></form>
        ${rows}
      </div>`,true,req.session.username));
  });
});

app.listen(3000,()=>console.log('App running at http://localhost:3000'));