// Import required modules
const express = require('express');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, 'public')));

// Load coupons and claims from JSON file
const loadData = () => {
    try {
        return JSON.parse(fs.readFileSync('data.json'));
    } catch (err) {
        return { coupons: [], claims: [] };
    }
};

const saveData = (data) => {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
};

// Initialize data file
if (!fs.existsSync('data.json')) {
    saveData({ coupons: [{ code: 'COUPON1' }, { code: 'COUPON2' }, { code: 'COUPON3' }], claims: [] });
}

// Endpoint to claim a coupon
app.post('/claim', (req, res) => {
    const userIp = req.clientIp;
    const userCookie = req.cookies.claimed;
    let data = loadData();

    // Check IP restriction (1 hour limit)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const existingClaim = data.claims.find(claim => claim.ip === userIp && claim.timestamp > oneHourAgo);
    
    if (existingClaim || userCookie) {
        return res.status(429).json({ message: '❌ You can claim another coupon after 1 hour.' });
    }

    // Assign next available coupon in round-robin
    const coupon = data.coupons.shift();
    if (!coupon) {
        return res.status(400).json({ message: '⚠️ No coupons available' });
    }

    // Store claim info
    data.claims.push({ ip: userIp, timestamp: Date.now() });
    saveData(data);
    res.cookie('claimed', true, { maxAge: 60 * 60 * 1000 });

    return res.json({ message: `🎉 Coupon claimed successfully! Your code: ${coupon.code}` });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

