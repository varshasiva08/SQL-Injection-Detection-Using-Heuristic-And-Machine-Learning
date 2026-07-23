//Database created at http://localhost/phpmyadmin
const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Middleware to parse form data (username/password)
app.use(express.urlencoded({ extended: true }));

// Create connection to MySQL database running in XAMPP
const db = mysql.createConnection({
  host: 'localhost',      // MySQL server is running 
  user: 'root',           // Default XAMPP MySQL user
  password: 'svarsha08112005',           // XAMPP has no password set no null
  database: 'login_demo'  // login_demo is database created using XAMPP
});

//Connecting to the Database
db.connect(err => {
  if (err) throw err; // Shows error if the connection fails
  console.log('Connected to MySQL'); 
});

// Login Form that asks for input of username and password on screen
app.get('/', (req, res) => {
  res.send(`
    <h2>Login (Vulnerable)</h2>
    <form method="POST" action="/login">
      Username: <input name="username" /><br /><br />
      Password: <input name="password" /><br /><br />
      <button type="submit">Login</button>
    </form>
  `);
});

// Handles the submissions
app.post('/login', (req, res) => {
  // Extract username and password from the form
  const { username, password } = req.body;

  // VULNERABLE SQL query: directly uses user input
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  // Send the query to the database
  db.query(query, (err, results) => {
    if (err) return res.send("SQL Error: " + err); // Show the error if there is any MYSQL error

    if (results.length > 0) {
      // If matching users found, show success and display user info
      let output = `<h3>Login Successful </h3><hr>`;
      results.forEach(row => {
        output += `<p>ID: ${row.id}, Username: ${row.username}, Password: ${row.password}</p>`;
      });
      res.send(output);
    } else {
      // No match found: login failed
      res.send(`<p>Invalid login.</p>`);
    }
  });
});

//Starts the server at port 3000
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
