const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CẤU HÌNH SERVER ---
app.set('trust proxy', 1); // Fix lỗi Rate Limit trên Railway
app.use(cors()); // Fix lỗi CORS
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
        console.error(`Lỗi đọc file ${file}:`, error);
        return [];
    }
};

const writeFile = async (file, data) => {
    await fsPromises.writeFile(file, JSON.stringify(data, null, 2));
};

// --- 4. CẤU HÌNH GỬI MAIL (Đã đổi sang Port 587 để fix lỗi Timeout) ---
const JWT_SECRET = process.env.JWT_SECRET || "Mat_Khau_Bi_Mat_Tam_Thoi_123";

const transporter = nodemailer.createTransport({
    service: 'gmail', // Dùng lại service 'gmail' cho đơn giản
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    family: 4 
});

const sendOTP = async (email, otp) => {
    try {
        if (!process.env.EMAIL_USER) throw new Error("Chưa cấu hình mail");
        
        await transporter.sendMail({
            from: '"NewsDaily" <noreply@newsdaily.com>',
            to: email,
            subject: 'Mã xác thực OTP',
            text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`
        });
        console.log(`✅ Đã gửi mail OTP đến ${email}`);
        return { success: true };
    } catch (e) {
        console.error("❌ LỖI GỬI MAIL CHI TIẾT:", e); // In lỗi ra Logs để debug
        return { success: false, otp: otp };
    }
};

// --- 5. MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token lỗi hoặc hết hạn" });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Không có quyền Admin" });
    next();
};

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// --- 6. ROUTES ---

// Health Check
app.get('/', (req, res) => res.send("✅ Server NewsDaily đang chạy ổn định!"));

// A. AUTH ROUTES
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
        if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email đã tồn tại" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const newUser = {
            id: Date.now().toString(), name, email, password: hashedPassword,
            role: "user", isVerified: false, otp, otpExpires: Date.now() + 600000,
            phone, address, dob, gender, avatar: avatar || `https://ui-avatars.com/api/?name=${name}`
        };
        
        users.push(newUser);
        await writeFile(USERS_FILE, users);
        
        // Gửi mail kiểu Fire-and-Forget (Không chờ) để App nhanh
        sendOTP(email, otp).catch(err => console.error("Lỗi gửi mail ngầm:", err));
        
        res.json({ message: "Đăng ký thành công! Đang gửi OTP..." });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP không chính xác" });
        
        u.isVerified = true;
        u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "Xác thực thành công" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/check-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP không chính xác" });
        res.json({ message: "OTP hợp lệ" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

// ROUTE: Gửi lại OTP / Quên mật khẩu (Fire-and-Forget)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u) return res.status(404).json({ message: "Email không tồn tại" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        u.otp = otp;
        u.otpExpires = Date.now() + 600000;
        await writeFile(USERS_FILE, users);

        // Gửi mail không chờ
        sendOTP(email, otp).catch(err => console.error("Lỗi gửi mail ngầm:", err));
        
        res.json({ message: "Đã gửi lại OTP" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.email === email);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai hoặc hết hạn" });

        u.password = await bcrypt.hash(newPassword, 12);
        u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đặt lại mật khẩu thành công" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

// B. USER ROUTES
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const users = await readFile(USERS_FILE);
    res.json(users.map(({ password, otp, securityCode, ...u }) => u));
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const users = await readFile(USERS_FILE);
        if (users.find(u => u.email === email)) return res.status(400).json({ message: "Email tồn tại" });
        const hashedPassword = await bcrypt.hash(password, 12);
        users.push({ id: Date.now().toString(), name, email, password: hashedPassword, role: role || "user", isVerified: true, avatar: `https://ui-avatars.com/api/?name=${name}` });
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đã thêm User" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await readFile(USERS_FILE);
        const idx = users.findIndex(u => u.id == req.params.id);
        if (idx === -1) return res.status(404).json({ message: "Not found" });
        const { name, role, phone, address, dob, gender } = req.body;
        users[idx] = { ...users[idx], name, role, phone, address, dob, gender };
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đã cập nhật" });
    } catch (e) { res.status(500).json({ message: "Lỗi" }); }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        let users = await readFile(USERS_FILE);
        users = users.filter(u => u.id != req.params.id);
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đã xóa User" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/user/update-profile', authenticateToken, async (req, res) => {
    try {
        const users = await readFile(USERS_FILE);
        const index = users.findIndex(u => u.id === req.user.id);
        if (index === -1) return res.status(404).json({ message: "User not found" });
        
        const { name, phone, address, dob, gender, avatar } = req.body;
        if(name) users[index].name = name;
        if(phone) users[index].phone = phone;
        if(address) users[index].address = address;
        if(dob) users[index].dob = dob;
        if(gender) users[index].gender = gender;
        if(avatar) users[index].avatar = avatar;
        
        await writeFile(USERS_FILE, users);
        const { password, otp, securityCode, ...updatedUser } = users[index];
        updatedUser.hasSecurityCode = !!users[index].securityCode;
        res.json({ message: "Cập nhật thành công", user: updatedUser });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.post('/api/user/request-otp', authenticateToken, async (req, res) => {
    try {
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.id === req.user.id);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        u.otp = otp;
        await writeFile(USERS_FILE, users);
        sendOTP(u.email, otp).catch(e => console.error("Lỗi mail:", e));
        res.json({ message: "Đã gửi OTP" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/user/change-password-otp', authenticateToken, async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const users = await readFile(USERS_FILE);
        const u = users.find(x => x.id === req.user.id);
        if (!u || u.otp !== otp) return res.status(400).json({ message: "OTP sai" });
        u.password = await bcrypt.hash(newPassword, 12);
        u.otp = undefined;
        await writeFile(USERS_FILE, users);
        res.json({ message: "Đổi mật khẩu thành công" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

app.put('/api/user/security-code', authenticateToken, async (req, res) => {
    try {
        const { securityCode } = req.body;
        if (!securityCode || securityCode.length < 4) return res.status(400).json({ message: "Mã bảo vệ phải từ 4 ký tự" });
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
        if (!user.securityCode) return res.status(400).json({ message: "Chưa thiết lập mã bảo vệ" });
        const isMatch = await bcrypt.compare(securityCode, user.securityCode);
        if (!isMatch) return res.status(400).json({ message: "Mã bảo vệ không đúng" });
        res.json({ message: "Xác thực thành công" });
    } catch (e) { res.status(500).json({ message: "Lỗi Server" }); }
});

// C. POSTS ROUTES
app.get('/api/posts', async (req, res) => { 
    const posts = await readFile(POSTS_FILE); 
    res.json(posts.reverse()); 
});

app.get('/api/posts/:id', async (req, res) => { 
    const posts = await readFile(POSTS_FILE); 
    const p = posts.find(x => x.id == req.params.id); 
    p ? res.json(p) : res.status(404).json({message: "Not found"}); 
});

app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => {
    try { 
        const newPost = { ...req.body, id: Date.now(), author: req.user.name || "Admin", date: new Date().toLocaleDateString('vi-VN'), views: 0 }; 
        const posts = await readFile(POSTS_FILE); 
        posts.push(newPost); 
        await writeFile(POSTS_FILE, posts); 
        res.json({ message: "Đã thêm bài viết", post: newPost }); 
    } catch { res.status(500).json({ message: "Lỗi" }); }
});

app.put('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { 
        const posts = await readFile(POSTS_FILE); 
        const idx = posts.findIndex(x => x.id == req.params.id); 
        if (idx === -1) return res.status(404).json({message: "Not found"}); 
        posts[idx] = { ...posts[idx], ...req.body }; 
        await writeFile(POSTS_FILE, posts); 
        res.json({ message: "Đã cập nhật" }); 
    } catch { res.status(500).json({ message: "Lỗi" }); }
});

app.delete('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { 
        let posts = await readFile(POSTS_FILE); 
        posts = posts.filter(x => x.id != req.params.id); 
        await writeFile(POSTS_FILE, posts); 
        res.json({ message: "Đã xóa bài viết" }); 
    } catch { res.status(500).json({ message: "Lỗi" }); }
});

// --- 7. KHỞI ĐỘNG SERVER AN TOÀN (Async Startup - Fix Crash) ---
const startServer = async () => {
    console.log("🚀 Đang khởi động Server...");

    // 1. Tạo thư mục data
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    // 2. Tạo Admin mặc định
    if (!fs.existsSync(USERS_FILE)) {
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        const adminUser = [{
            id: "admin001", name: "Administrator", email: "admin@newsdaily.com", 
            password: hashedPassword, isVerified: true, role: "admin", 
            avatar: "https://ui-avatars.com/api/?name=Admin+User"
        }];
        await writeFile(USERS_FILE, adminUser);
        console.log("✅ Đã tạo Admin mặc định");
    }

    // 3. Tạo Bài viết mẫu (Nếu file chưa có)
    if (!fs.existsSync(POSTS_FILE)) {
        const SAMPLE_POSTS = [
            { id: 1, title: "Chàng trai 9x bỏ phố về quê", category: "Sống Xanh", image: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=80", author: "Thu Hà", date: "24/11/2024", views: 2450, summary: "Tóm tắt...", content: "Nội dung..." },
            // (Thêm các bài mẫu khác nếu muốn)
        ];
        await writeFile(POSTS_FILE, SAMPLE_POSTS);
        console.log("✅ Đã tạo bài viết mẫu");
    }

    // 4. BẮT ĐẦU NGHE CỔNG
    app.listen(PORT, () => console.log(`✅ Server đang chạy trên cổng ${PORT}`));
};

startServer();