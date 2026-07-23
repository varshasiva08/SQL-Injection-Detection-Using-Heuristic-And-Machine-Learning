# SQL Injection Detection System

A university student portal with a 3-layer defence against SQL injection attacks — regex heuristics, an ML ensemble, and email-based 2FA.

## What it does

Simulates a real attack scenario: a vulnerable portal vs a hardened one. The vulnerable version (`vulnerable.js`) can be exploited with standard SQLMap payloads to dump the database. The protected version blocks every attempt before it reaches MySQL.

### Detection layers

| Layer | Method | Purpose |
|---|---|---|
| 1 | Regex heuristics | Catches obvious patterns instantly — quotes, `--`, `UNION`, `SLEEP` |
| 2 | ML ensemble (LR + RF) | Catches sophisticated payloads that bypass simple rules |
| 3 | Email OTP 2FA | Even if credentials are stolen, login requires access to the registered inbox |

All blocked attempts are timestamped and logged to `logs.txt` with IP and context.

### ML Model

- Dataset: 30,608 samples from a public SQLi benchmark (Kaggle)
- Models: Logistic Regression + Random Forest, OR-vote ensemble
- LR 5-fold F1: **97.8%** | RF 5-fold F1: **99.4%**
- OR-vote logic: if either model flags an input, it is blocked

### Auth flow

```
Register → Email OTP → Dashboard
Login    → Email OTP → Dashboard
```

OTPs are 6 digits, expire in 5 minutes, and are sent via Nodemailer (Gmail SMTP).

## Stack

- **Backend:** Node.js, Express, MySQL
- **ML API:** Python, Flask, Scikit-learn (Logistic Regression + Random Forest)
- **Email:** Nodemailer
- **Attack testing:** SQLMap

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd Varsha_Mysql_Code
npm install
pip install flask scikit-learn pandas joblib
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MYSQL_PASSWORD=your_mysql_password
SESSION_SECRET=your_random_secret
```

### 3. Set up MySQL

```sql
CREATE DATABASE login_demo;
USE login_demo;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  password VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'student'
);

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(50),
  marks INT
);

INSERT INTO students VALUES
  (null, 'Alice', 'CSE', 88),
  (null, 'Bob', 'ECE', 75),
  (null, 'Charlie', 'ISE', 92);
```

### 4. Train the ensemble

Place `archive.zip` (Kaggle SQLi dataset) in the project folder, then:

```bash
python train_ensemble.py
```

This generates `lr_model.pkl`, `rf_model.pkl`, `sqli_vectorizer.pkl` and prints cross-validation F1 scores.

### 5. Run

```bash
# Terminal 1 — ML API
python ml_api.py

# Terminal 2 — Web app
node main.js
```

Open `http://localhost:3000`

## Testing with SQLMap

### Before (vulnerable version)

```bash
node vulnerable.js
```

```bash
python sqlmap-master/sqlmap.py -u "http://localhost:3000/login" \
  --data="username=admin&password=test" \
  --method=POST --current-db --batch

python sqlmap-master/sqlmap.py -u "http://localhost:3000/login" \
  --data="username=admin&password=test" \
  --method=POST -D login_demo --tables --batch
```

SQLMap successfully enumerates the database and tables.

### After (protected version)

```bash
python ml_api.py   # terminal 1
node main.js       # terminal 2
```

```bash
python sqlmap-master/sqlmap.py -u "http://localhost:3000/login" \
  --data="username=admin&password=test" \
  --method=POST --dbs --batch --level=3 --risk=2
```

Every payload gets blocked and logged. SQLMap reports no injectable parameters.

## Project structure

```
├── main.js              # Protected app — heuristics + ML + email OTP
├── vulnerable.js        # Vulnerable version for before/after demo
├── ml_api.py            # Flask API serving the ensemble
├── train_ensemble.py    # Trains LR + RF, prints CV scores, saves models
├── setup_totp.py        # (Legacy) TOTP setup — replaced by email OTP
├── .env.example         # Environment variable template
└── confusion_matrix_ensemble.png
```
