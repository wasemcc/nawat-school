const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1557460670784602143/ufozMwej-QXOnkYeffpQyjjlpu_6JnDJU-tQqaIvGrSg7dCz8EcsLxNoUR3arqT6s66I';

// Helper function to send log to Discord Webhook
function sendDiscordWebhook(embedData) {
    try {
        const payload = JSON.stringify({
            embeds: [embedData]
        });

        const url = new URL(DISCORD_WEBHOOK_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            res.on('data', () => {});
        });

        req.on('error', (err) => {
            console.error('Discord Webhook Error:', err.message);
        });

        req.write(payload);
        req.end();
    } catch (err) {
        console.error('Failed to send Discord webhook:', err.message);
    }
}

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

// API endpoint to log visits
app.post('/api/visit', (req, res) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

    sendDiscordWebhook({
        title: '👁️ دخول زائر جديد إلى الموقع',
        color: 3447003, // Blue
        fields: [
            { name: 'عنوان IP', value: String(ip), inline: true },
            { name: 'الوقت', value: new Date().toLocaleString('ar-LY', { timeZone: 'Africa/Tripoli' }), inline: true },
            { name: 'المتصفح / الجهاز', value: String(userAgent).substring(0, 200) }
        ],
        footer: { text: 'مدرسة النواة للتعليم الخاص - نظام التتبع' },
        timestamp: new Date().toISOString()
    });

    res.status(200).json({ status: 'ok' });
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

        // Send Discord notification for new order
        sendDiscordWebhook({
            title: '📝 طلب تسجيل وسجل جديد بالموقع!',
            color: 5763719, // Green
            fields: [
                { name: 'اسم ولي الأمر', value: String(parentName || '-'), inline: true },
                { name: 'رقم الهاتف', value: String(phone || '-'), inline: true },
                { name: 'اسم الطفل', value: String(childName || '-'), inline: true },
                { name: 'عمر الطفل', value: `${childAge} سنوات`, inline: true },
                { name: 'الخدمة المطلوبة', value: String(service || '-'), inline: true },
                { name: 'تاريخ الزيارة الفضل', value: String(visitDate || 'غير محدد'), inline: true },
                { name: 'ملاحظات إضافية', value: String(notes || 'لا يوجد') }
            ],
            footer: { text: `رقم الطلب #${this.lastID} • مدرسة النواة للتعليم الخاص` },
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ message: 'Order created successfully', id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
