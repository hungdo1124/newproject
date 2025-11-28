const express = require('express');
const fs = require('fs'); 
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors'); // Import cors
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);
// --- QUAN TRỌNG: CẤU HÌNH CORS VÀ JSON LÊN ĐẦU TIÊN ---
// Để tránh lỗi chặn kết nối và lỗi không đọc được body
app.use(cors()); 
app.use(helmet());
app.use(express.json({ limit: '50mb' })); 

// --- CẤU HÌNH ĐƯỜNG DẪN (Dùng path.resolve cho chuẩn Linux) ---
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// --- HÀM HELPER ĐỌC/GHI FILE AN TOÀN ---
// Hàm này giúp server không bị sập nếu file chưa tồn tại
const readFile = async (file) => {
    try {
        if (!fs.existsSync(file)) return []; // Nếu file chưa có thì trả về rỗng ngay
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

// --- DỮ LIỆU MẪU (BÀI VIẾT) ---
const SAMPLE_POSTS = [
    // ... (Giữ nguyên danh sách bài viết dài của bạn ở đây, tôi rút gọn để code dễ nhìn) ...
    { id: 1, title: "Chàng trai 9x bỏ phố về quê", summary: "Tóm tắt...", category: "Sống Xanh", image: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=80", author: "Thu Hà", date: "24/11/2024", views: 2450, content: "Nội dung..." },
    { id: 2, title: "Du lịch chữa lành", summary: "Tóm tắt...", category: "Du Lịch", image: "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?auto=format&fit=crop&w=800&q=80", author: "Việt Travel", date: "23/11/2024", views: 1890, content: "Nội dung..." },
    // Bạn hãy paste lại đống bài viết mẫu của bạn vào đây nhé
];

// --- KHỞI TẠO DỮ LIỆU (TỰ ĐỘNG TẠO FILE KHI KHỞI ĐỘNG) ---
// Bước này cực quan trọng để tránh lỗi Timeout
const initializeData = async () => {
    // 1. Tạo thư mục data
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log("📂 Đã tạo thư mục data");
    }

    // 2. Tạo file Users & Admin mặc định
    if (!fs.existsSync(USERS_FILE)) {
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        const adminUser = [{
            id: "admin001", name: "Administrator", email: "admin@newsdaily.com", 
            password: hashedPassword, isVerified: true, role: "admin", 
            avatar: "https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
        }];
        await writeFile(USERS_FILE, adminUser);
        console.log("👤 Đã tạo file Users mặc định");
    }

    // 3. Tạo file Posts mặc định
    const posts = await readFile(POSTS_FILE);
    if (posts.length === 0) {
        await writeFile(POSTS_FILE, SAMPLE_POSTS);
        console.log("📝 Đã tạo file Posts mặc định");
    }
};

// Chạy khởi tạo
initializeData();

// --- CẤU HÌNH JWT & MAIL ---
const JWT_SECRET = process.env.JWT_SECRET || "Mat_Khau_Bi_Mat_Tam_Thoi_123"; 
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });

const sendOTP = async (email, otp) => {
    try {
        if (!process.env.EMAIL_USER) throw new Error("Chưa cấu hình mail");
        await transporter.sendMail({ from: '"NewsDaily" <noreply@newsdaily.com>', to: email, subject: 'Mã OTP', text: `OTP: ${otp}` });
        return { success: true };
    } catch (e) { console.log("Dev OTP:", otp); return { success: false, otp: otp }; }
};

// --- MIDDLEWARE AUTH ---
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
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Không có quyền Admin" });
    next();
};

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// --- ROUTES ---

// Route kiểm tra server sống hay chết
app.get('/', (req, res) => {
    res.send("Server NewsDaily đang chạy ngon lành! Data lưu tại: " + DATA_DIR);
});

// 1. POSTS API
app.get('/api/posts', async (req, res) => { 
    const posts = await readFile(POSTS_FILE); 
    res.json(posts.reverse()); 
});
app.get('/api/posts/:id', async (req, res) => { 
    const posts = await readFile(POSTS_FILE); 
    const p = posts.find(x => x.id == req.params.id); 
    p ? res.json(p) : res.status(404).json({message: "Not found"}); 
});
// (Giữ nguyên các route thêm/sửa/xóa bài viết của bạn)
app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => {
    try { const newPost = { ...req.body, id: Date.now(), author: req.user.name || "Admin", date: new Date().toLocaleDateString('vi-VN'), views: 0 }; const posts = await readFile(POSTS_FILE); posts.push(newPost); await writeFile(POSTS_FILE, posts); res.json({ message: "Đã thêm!", post: newPost }); } catch { res.status(500).json({ message: "Lỗi" }); }
});
// ... Paste nốt các route PUT, DELETE posts của bạn vào đây ...


// 2. USERS API
// (Paste các route Users của bạn vào đây)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => { const users = await readFile(USERS_FILE); res.json(users.map(({ password, otp, securityCode, ...u }) => u)); });
// ...


// 3. AUTH API
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body; 
        const users = await readFile(USERS_FILE); // Dùng hàm helper an toàn
        const u = users.find(x => x.email === email);
        if (!u) return res.status(400).json({ message: "Email chưa đăng ký" });
        // if (!u.isVerified) return res.status(400).json({ message: "Tài khoản chưa xác thực" });
        const isMatch = await bcrypt.compare(password, u.password);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });
        const userData = { id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role, phone: u.phone, address: u.address, dob: u.dob, gender: u.gender, hasSecurityCode: !!u.securityCode };
        const token = jwt.sign({id: u.id, role: u.role}, JWT_SECRET, {expiresIn:'24h'});
        res.json({token, user: userData});
    } catch (err) { res.status(500).json({ message: "Lỗi Server: " + err.message }); }
});

// (Paste nốt các route Register, OTP... của bạn vào đây, logic giữ nguyên)
app.post('/api/auth/register', async (req, res) => {
    // ... Code register của bạn ...
    // Nhớ dùng hàm readFile(USERS_FILE) và writeFile(USERS_FILE, users) thay vì fsPromises trực tiếp
    // Để tránh lỗi nhé
    try {
        const { name, email, password, phone, address, dob, gender, avatar } = req.body;
        const users = await readFile(USERS_FILE);
        // ... Logic y hệt cũ ...
        // Demo ngắn gọn:
        let user = users.find(u => u.email === email);
        if (user) return res.status(400).json({message: "Email tồn tại"});
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = { id: Date.now().toString(), name, email, password: hashedPassword, role: "user", isVerified: true, avatar: avatar || "" };
        users.push(newUser);
        await writeFile(USERS_FILE, users);
        res.json({message: "Đăng ký thành công"});
    } catch (e) { res.status(500).json({message: "Lỗi: " + e.message})}
});

app.listen(PORT, () => console.log(`✅ Server chạy trên cổng ${PORT}`));