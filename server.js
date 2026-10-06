const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parentName TEXT,
            phone TEXT,
            childName TEXT,
            childAge INTEGER,
            service TEXT,
            visitDate TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// API endpoint to receive orders
app.post('/api/order', (req, res) => {
    const { parentName, phone, childName, childAge, service, visitDate, notes } = req.body;

    const query = `INSERT INTO orders (parentName, phone, childName, childAge, service, visitDate, notes) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [parentName, phone, childName, childAge, service, visitDate, notes], function(err) {
        if (err) {
            console.error('Error inserting data', err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(201).json({ message: 'Order created successfully', id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
