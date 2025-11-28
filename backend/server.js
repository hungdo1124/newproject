const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // Giữ lại nếu dùng Gmail, hoặc bỏ nếu dùng Resend thuần
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CẤU HÌNH SERVER ---
app.set('trust proxy', 1);
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' }));

// --- 2. CẤU HÌNH ĐƯỜNG DẪN ---
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// --- 3. HELPER FUNCTIONS ---
const readFile = async (file) => {
    try {
        if (!fs.existsSync(file)) return [];
        const data = await fsPromises.readFile(file, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        return [];
    }
};

const writeFile = async (file, data) => {
    await fsPromises.writeFile(file, JSON.stringify(data, null, 2));
};

const JWT_SECRET = process.env.JWT_SECRET || "Mat_Khau_Bi_Mat_Tam_Thoi_123";

// Cấu hình Mail (Dev Mode: In ra Log để tránh lỗi)
const sendOTP = async (email, otp) => {
    console.log("\n====================================================");
    console.log(`🔑 DEV MODE - MÃ OTP CỦA [${email}]: ${otp}`);
    console.log("====================================================\n");
    return { success: true };
};

// --- 4. MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token lỗi" });
        req.user = user; next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Không Admin" });
    next();
};

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// --- 5. ROUTES ---
app.get('/', (req, res) => res.send("✅ Server Full Features Running!"));

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u) return res.status(400).json({ message: "Email chưa đăng ký" });
        const isMatch = await bcrypt.compare(password, u.password);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });
        const userData = { id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role, phone: u.phone, address: u.address, dob: u.dob, gender: u.gender, hasSecurityCode: !!u.securityCode };
        const token = jwt.sign({ id: u.id, role: u.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: userData });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, address, dob, gender, avatar } = req.body;
        const users = await readFile(USERS_FILE);
        if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email tồn tại" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const newUser = {
            id: Date.now().toString(), name, email, password: hashedPassword,
            role: "user", isVerified: false, otp, otpExpires: Date.now() + 600000,
            phone, address, dob, gender, avatar: avatar || `https://ui-avatars.com/api/?name=${name}`
        };
        users.push(newUser);
        await writeFile(USERS_FILE, users);
        await sendOTP(email, otp);
        res.json({ message: "Chuyển sang bước nhập OTP..." });
    } catch (e) { res.status(500).json({ message: "Lỗi: " + e.message }); }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai" });
        u.isVerified = true; u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

app.post('/api/auth/check-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai" });
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u) return res.status(404).json({ message: "Email không tồn tại" });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        u.otp = otp;
        await writeFile(USERS_FILE, users);
        await sendOTP(email, otp);
        res.json({ message: "Đã gửi lại OTP" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai" });
        u.password = await bcrypt.hash(newPassword, 12); u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

// --- USER ROUTES (Bao gồm Security Code) ---
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => { const users = await readFile(USERS_FILE); res.json(users); });
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => { try { const users = await readFile(USERS_FILE); users.push(req.body); await writeFile(USERS_FILE, users); res.json({message:"OK"}); } catch(e){res.status(500).json({message:"Err"});} });
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => { try { let users = await readFile(USERS_FILE); users = users.filter(u => u.id != req.params.id); await writeFile(USERS_FILE, users); res.json({message:"OK"}); } catch(e){res.status(500).json({message:"Err"});} });
app.put('/api/user/update-profile', authenticateToken, async (req, res) => { try { const users = await readFile(USERS_FILE); const idx = users.findIndex(u=>u.id===req.user.id); if(idx!==-1){ users[idx]={...users[idx], ...req.body}; await writeFile(USERS_FILE, users); res.json({user: users[idx]}); } } catch(e){res.status(500).json({message:"Err"});} });

// 👇👇👇 CÁC ROUTE SECURITY CODE BỊ THIẾU ĐÂY 👇👇👇
app.put('/api/user/security-code', authenticateToken, async (req, res) => {
    try {
        const { securityCode } = req.body;
        if (!securityCode || securityCode.length < 4) return res.status(400).json({ message: "Mã phải >= 4 ký tự" });
        const users = await readFile(USERS_FILE);
        const index = users.findIndex(u => u.id === req.user.id);
        users[index].securityCode = await bcrypt.hash(securityCode, 10);
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đã lưu mã bảo vệ" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/user/verify-security', authenticateToken, async (req, res) => {
    try {
        const { securityCode } = req.body;
        const users = await readFile(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        if (!user.securityCode) return res.status(400).json({ message: "Chưa tạo mã" });
        const isMatch = await bcrypt.compare(securityCode, user.securityCode);
        if (!isMatch) return res.status(400).json({ message: "Mã sai" });
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/user/request-otp', authenticateToken, async (req, res) => {
    try {
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.id === req.user.id);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        u.otp = otp;
        await writeFile(USERS_FILE, users);
        await sendOTP(u.email, otp);
        res.json({ message: "Đã gửi OTP" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/user/change-password-otp', authenticateToken, async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.id === req.user.id);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai" });
        u.password = await bcrypt.hash(newPassword, 12); u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});
// 👆👆👆 -------------------------------------- 👆👆👆

// --- POSTS ROUTES ---
app.get('/api/posts', async (req, res) => { const posts = await readFile(POSTS_FILE); res.json(posts.reverse()); });
app.get('/api/posts/:id', async (req, res) => { const posts = await readFile(POSTS_FILE); const p = posts.find(x=>x.id==req.params.id); p?res.json(p):res.status(404).json({message:"Not found"}); });
app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => { try { const posts = await readFile(POSTS_FILE); posts.push(req.body); await writeFile(POSTS_FILE, posts); res.json({message:"OK"}); } catch(e){res.status(500).json({message:"Err"});} });
app.put('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => { try { const posts = await readFile(POSTS_FILE); const idx = posts.findIndex(x=>x.id==req.params.id); if(idx!==-1){ posts[idx]={...posts[idx], ...req.body}; await writeFile(POSTS_FILE, posts); res.json({message:"OK"}); } } catch(e){res.status(500).json({message:"Err"});} });
app.delete('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => { try { let posts = await readFile(POSTS_FILE); posts = posts.filter(x=>x.id!=req.params.id); await writeFile(POSTS_FILE, posts); res.json({message:"OK"}); } catch(e){res.status(500).json({message:"Err"});} });

// --- 6. KHỞI ĐỘNG AN TOÀN ---
const startServer = async () => {
    console.log("🚀 Khởi động...");
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    
    // Tạo Admin nếu chưa có
    if (!fs.existsSync(USERS_FILE)) {
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        const adminUser = [{ id: "admin001", name: "Administrator", email: "admin@newsdaily.com", password: hashedPassword, isVerified: true, role: "admin", avatar: "https://ui-avatars.com/api/?name=Admin+User" }];
        await writeFile(USERS_FILE, adminUser);
    }
    // Tạo Posts nếu chưa có
    if (!fs.existsSync(POSTS_FILE)) {
        await writeFile(POSTS_FILE, []);
    }

    app.listen(PORT, () => console.log(`✅ Server chạy trên cổng ${PORT}`));
};
startServer();