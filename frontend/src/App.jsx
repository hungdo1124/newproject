import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { 
  Search, Menu, X, User, ChevronRight, Clock, 
  ThumbsUp, Share2, Send, Lock, Mail, Key, ShieldCheck, Sun, Moon,
  Eye, EyeOff, FileText, RefreshCw, Plus, Edit2, Trash2, Image as ImageIcon,
  Phone, MapPin, Calendar, Users, LayoutDashboard, UploadCloud, LockKeyhole,
  CheckCircle, AlertCircle, LogIn 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CẤU HÌNH ---
const USE_MOCK_API = false; 
const API_URL = import.meta.env.VITE_API_URL;
const CATEGORIES = ['Sống Xanh', 'Du Lịch', 'Ẩm Thực', 'Sức Khỏe', 'Công Nghệ', 'Văn Hóa'];

const FALLBACK_POSTS = [{ id: 1, title: "Đang tải...", category: "Tin tức", image: "", author: "System", date: "...", summary: "Vui lòng đợi...", content: "..." }];

const maskEmail = (e) => {
    if (!e) return "";
    const parts = e.split('@');
    if (parts[0].length <= 2) return e;
    return `${parts[0][0]}***${parts[0].slice(-1)}@${parts[1]}`;
};
const maskPhone = (p) => (!p || p.length < 4) ? p : `${p.slice(0, 3)}****${p.slice(-3)}`;

// --- HELPER: PASSWORD STRENGTH ---
const checkPasswordStrength = (password) => {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#\$%\^&\*]/.test(password)
    };
};

// --- UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const variants = { 
      primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30", 
      secondary: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700", 
      danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30", 
      outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800",
      ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${variants[variant]} ${className} disabled:opacity-50`}>
      {Icon && <Icon className="w-4 h-4 mr-2" />}{children}</button>
  );
};

const Input = ({ label, type, value, onChange, icon: Icon, error, textarea, disabled, autoComplete }) => {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div className="mb-4"><label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
      <div className="relative">
        {Icon && !textarea && <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />}
        {textarea ? <textarea rows="4" value={value} onChange={onChange} className={`w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none`} disabled={disabled} />
        : <input 
            type={isPass ? (show ? 'text' : 'password') : type} 
            value={value} onChange={onChange} 
            autoComplete={autoComplete}
            className={`w-full ${Icon ? 'pl-10' : 'pl-3'} p-2.5 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${error ? 'border-red-500' : ''}`} 
            disabled={disabled} 
          />}
        {isPass && <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-gray-400"><Eye className="w-5 h-5" /></button>}
      </div>
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {error}</p>}
    </div>
  );
};

const PasswordMeter = ({ password }) => {
    const strength = checkPasswordStrength(password);
    const Item = ({ valid, text }) => (
        <div className={`flex items-center gap-1 text-xs ${valid ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
            {valid ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300"></div>}
            <span>{text}</span>
        </div>
    );
    return (
        <div className="mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 grid grid-cols-2 gap-2">
            <Item valid={strength.length} text="Tối thiểu 8 ký tự" />
            <Item valid={strength.uppercase} text="Chữ in hoa (A-Z)" />
            <Item valid={strength.number} text="Số (0-9)" />
            <Item valid={strength.special} text="Ký tự đặc biệt (!@#)" />
        </div>
    );
};

// --- MODALS ---
const PostFormModal = ({ onClose, onSubmit, initialData }) => {
    const [form, setForm] = useState(initialData || { title: '', summary: '', content: '', category: CATEGORIES[0], image: '' });
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); await onSubmit(form); setLoading(false); };
    const handleImageUpload = (e) => { const file = e.target.files[0]; if(file){ if(file.size>5*1024*1024){alert("Ảnh > 5MB"); return;} const reader=new FileReader(); reader.onloadend=()=>setForm({...form, image:reader.result}); reader.readAsDataURL(file); }};
    return ( <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"><motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl p-6"><h3 className="text-xl font-bold mb-4 dark:text-white">{initialData?'Sửa':'Thêm'} Bài</h3><form onSubmit={handleSubmit} className="space-y-4"><Input label="Tiêu đề" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /><div className="mb-4"><label className="dark:text-white">Mục</label><select className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="mb-4"><label className="dark:text-white">Ảnh</label><input type="file" onChange={handleImageUpload} className="w-full text-sm dark:text-gray-300"/>{form.image && <img src={form.image} className="h-20 mt-2 rounded"/>}</div><Input textarea label="Tóm tắt" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} /><Input textarea label="Nội dung" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Hủy</Button><Button type="submit" disabled={loading}>Lưu</Button></div></form></motion.div></div> );
};

const UserFormModal = ({ onClose, onSubmit, initialData }) => {
    const [form, setForm] = useState(initialData || { name: '', email: '', password: '', role: 'user', phone: '', dob: '', gender: 'Nam', address: '' });
    return ( <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"><motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl p-6"><h3 className="text-xl font-bold mb-4 dark:text-white">{initialData?'Sửa':'Thêm'} User</h3><form onSubmit={(e)=>{e.preventDefault();onSubmit(form)}} className="space-y-4"><Input label="Họ tên" type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} icon={User} />{!initialData&&<><Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} icon={Mail} /><Input label="Pass" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} icon={Key} /></>}<div className="grid grid-cols-2 gap-4"><Input label="SĐT" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} icon={Phone} /><Input label="Ngày sinh" type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})} icon={Calendar} /></div><div className="mb-4"><label className="block text-sm font-medium dark:text-gray-300">Giới tính</label><select className="w-full p-2.5 rounded border dark:bg-gray-800 dark:border-gray-700" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div><Input label="Địa chỉ" type="text" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} icon={MapPin} /><div className="mb-4"><label className="block text-sm font-medium dark:text-gray-300">Vai trò</label><select className="w-full p-2.5 rounded border dark:bg-gray-800 dark:border-gray-700" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="user">User</option><option value="admin">Admin</option></select></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Hủy</Button><Button type="submit">Lưu</Button></div></form></motion.div></div> );
};

const TermsModal = ({ onClose }) => ( 
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600"/> Điều khoản & Chính sách</h3>
                <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:bg-gray-100 rounded-full p-1" /></button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-6 text-justify">
                <p>Chào mừng bạn đến với NewsDaily. Việc bạn đăng ký tài khoản đồng nghĩa với việc bạn đồng ý với các điều khoản sau:</p>
                <section>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">1. Bảo mật thông tin</h4>
                    <p>Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Mật khẩu và Mã bảo vệ được <strong>mã hóa một chiều (Hashing)</strong> bằng thuật toán an toàn trước khi lưu trữ. Chúng tôi tuyệt đối không chia sẻ, bán hoặc trao đổi dữ liệu của bạn cho bên thứ ba.</p>
                </section>
                <section>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">2. Quy định sử dụng</h4>
                    <p>Bạn chịu trách nhiệm về các hoạt động trên tài khoản của mình. Nghiêm cấm các hành vi:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Spam, gửi tin nhắn rác.</li>
                        <li>Đăng tải nội dung đồi trụy, vi phạm pháp luật hoặc thuần phong mỹ tục.</li>
                        <li>Xâm phạm quyền sở hữu trí tuệ hoặc giả mạo người khác.</li>
                    </ul>
                </section>
                <section>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">3. Quyền sở hữu trí tuệ</h4>
                    <p>Các bài viết, hình ảnh và nội dung trên NewsDaily thuộc bản quyền của chúng tôi hoặc các tác giả cộng tác. Vui lòng không sao chép, tái bản khi chưa có sự đồng ý bằng văn bản.</p>
                </section>
                <p className="italic text-gray-500 mt-4">Cập nhật lần cuối: 24/11/2024</p>
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                <Button onClick={onClose}>Đã hiểu & Đồng ý</Button>
            </div>
        </motion.div>
    </div> 
);

const ResendTimer = ({ onResend }) => { const [timeLeft, setTimeLeft] = useState(60); useEffect(() => { if (timeLeft > 0) { const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000); return () => clearTimeout(timer); } }, [timeLeft]); const handleResend = () => { setTimeLeft(60); onResend(); }; return <div className="mt-4 text-center text-sm">{timeLeft > 0 ? <span className="text-gray-500">Gửi lại sau <span className="font-bold text-blue-600">{timeLeft}s</span></span> : <button type="button" onClick={handleResend} className="text-blue-600 hover:underline font-medium">Gửi lại OTP</button>}</div>; };

// --- AUTH FORM ---
const AuthForm = ({ type, formData, setFormData, loading, errors, onSubmit, onSwitchMode, darkMode, onOpenTerms, onForgotPassword, otpVerified, onVerifyOtpOnly, onResendOtp }) => {
  const title = type==='login'?'Đăng nhập':(type==='register'?'Đăng ký':(type==='otp'?'Xác thực OTP':(type==='forgot'?'Quên mật khẩu':'Đặt lại mật khẩu')));
  
  if(type==='reset'){ 
      return ( 
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-md mx-auto py-12">
            <div className={`p-8 rounded-2xl shadow-2xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white'}`}>
                <div className="text-center mb-8"><h2 className="text-2xl font-bold">{!otpVerified?"Nhập mã xác thực":"Tạo mật khẩu mới"}</h2></div>
                {!otpVerified ? (
                    <div>
                        <form onSubmit={onVerifyOtpOnly}>
                            <Input label="Mã OTP" type="text" value={formData.otp} onChange={e=>setFormData({...formData,otp:e.target.value})} icon={ShieldCheck} error={errors.otp} />
                            <Button type="submit" className="w-full mt-2" disabled={loading}>Xác thực OTP</Button>
                        </form>
                        <ResendTimer onResend={onResendOtp} />
                    </div>
                ) : ( 
                    <form onSubmit={onSubmit} autoComplete="off">
                        <Input label="Mật khẩu mới" type="password" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} icon={Key} autoComplete="new-password"/>
                        <Input label="Nhập lại" type="password" value={formData.confirmPassword} onChange={e=>setFormData({...formData,confirmPassword:e.target.value})} icon={Key} autoComplete="new-password"/>
                        <Button type="submit" className="w-full mt-2" disabled={loading}>Đổi mật khẩu</Button>
                    </form> 
                )}
            </div>
        </motion.div> 
      ); 
    }

  return ( 
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-md mx-auto py-12">
        <div className={`p-8 rounded-2xl shadow-2xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white'}`}>
            <div className="text-center mb-8"><h2 className="text-2xl font-bold">{title}</h2></div>
            <form onSubmit={onSubmit} autoComplete="off">
                {type==='register' && (
                    <>
                        <Input label="Họ tên" type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} icon={User} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="SĐT" type="tel" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} icon={Phone} />
                            <Input label="Ngày sinh" type="date" value={formData.dob} onChange={e=>setFormData({...formData,dob:e.target.value})} icon={Calendar} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium dark:text-gray-300">Giới tính</label>
                            <select className="w-full p-2.5 rounded border dark:bg-gray-800 dark:border-gray-700" value={formData.gender} onChange={e=>setFormData({...formData,gender:e.target.value})}>
                                <option value="Nam">Nam</option><option value="Nữ">Nữ</option>
                            </select>
                        </div>
                        <Input label="Địa chỉ" type="text" value={formData.address} onChange={e=>setFormData({...formData,address:e.target.value})} icon={MapPin} />
                    </>
                )}
                
                {['login','register','forgot'].includes(type) && <Input label="Email" type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} icon={Mail} error={errors.form} autoComplete="off" />}
                
                {['login','register'].includes(type) && (
                    <>
                        <Input label="Mật khẩu" type="password" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} icon={Key} error={errors.password} autoComplete="new-password" />
                        {type === 'register' && formData.password && <PasswordMeter password={formData.password} />}
                        {type==='register'&&<Input label="Nhập lại" type="password" value={formData.confirmPassword} onChange={e=>setFormData({...formData,confirmPassword:e.target.value})} icon={Key} error={errors.confirmPassword} autoComplete="new-password" />}
                    </>
                )}
                
                {type==='otp' && <Input label="Mã OTP" type="text" value={formData.otp} onChange={e=>setFormData({...formData,otp:e.target.value})} icon={ShieldCheck} error={errors.otp} />}
                
                {type==='login' && (
                    <div className="flex justify-between mb-6">
                        <div className="flex items-center">
                            <input type="checkbox" checked={formData.rememberMe} onChange={e=>setFormData({...formData,rememberMe:e.target.checked})} />
                            <label className="ml-2 text-sm">Ghi nhớ</label>
                        </div>
                        <button type="button" onClick={onForgotPassword} className="text-sm text-blue-600 hover:underline">Quên mật khẩu?</button>
                    </div>
                )}
                
                {/* --- FIX NÚT ĐIỀU KHOẢN --- */}
                {type==='register' && (
                    <div className="mb-6 flex items-start">
                        <div className="flex items-center h-5">
                            <input id="agree" type="checkbox" checked={formData.agreeTerms} onChange={e=>setFormData({...formData,agreeTerms:e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        </div>
                        <div className="ml-2 text-sm">
                            <span className="text-gray-500">Tôi đồng ý với </span>
                            <button type="button" onClick={onOpenTerms} className="text-blue-600 hover:underline font-bold">Điều khoản & Chính sách</button>
                        </div>
                    </div>
                )}
                
                {errors.terms && <p className="text-red-500 text-xs mb-4 ml-6">{errors.terms}</p>}
                
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {type==='forgot'?'Gửi OTP':(type==='login'?'Đăng nhập':(type==='register'?'Đăng ký':'Xác thực'))}
                </Button>
            </form>

            {type==='otp' && <ResendTimer onResend={onResendOtp} />}
            
            <div className="mt-6 text-center text-sm">
                {type==='login' ? <>Chưa có TK? <button onClick={()=>onSwitchMode('register')} className="text-blue-600">Đăng ký</button></> : <button onClick={()=>onSwitchMode('login')} className="text-blue-600">Quay lại Đăng nhập</button>}
            </div>
        </div>
    </motion.div> );
};

// --- USER PROFILE ---
const UserProfile = ({ user, setUser, onLogout, showToast }) => {
    const [mode, setMode] = useState('view'); 
    const [securityCode, setSecurityCode] = useState('');
    const [editForm, setEditForm] = useState({});
    const [loading, setLoading] = useState(false);
    
    const [passStep, setPassStep] = useState(1);
    const [passForm, setPassForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
    const [securityStep, setSecurityStep] = useState(1);
    const [otp, setOtp] = useState('');

    useEffect(() => { if (user) setEditForm({ ...user }); }, [user]);

    useEffect(() => {
        if (mode === 'verify_security' || mode === 'create_security') {
            setSecurityCode('');
        }
    }, [mode]);

    const handleCreateSecurity = async (e) => { e.preventDefault(); setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/security-code`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({securityCode})}); const data=await res.json(); if(res.ok){ showToast("Tạo mã thành công!"); setUser({...user, hasSecurityCode:true}); setMode('view'); } else showToast(data.message,"error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    
    const handleRequestOTPSecurity = async () => { setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/request-otp`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}}); const data=await res.json(); showToast(data.message); setSecurityStep(2); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    const handleChangeSecurity = async (e) => { e.preventDefault(); setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/security-code`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({securityCode, otp})}); const data=await res.json(); if(res.ok){ showToast("Đổi mã thành công!"); setMode('view'); setSecurityStep(1); setOtp(''); setSecurityCode(''); } else showToast(data.message,"error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    
    const handleVerifySecurity = async (e) => { e.preventDefault(); setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/verify-security`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({securityCode})}); const data=await res.json(); if(res.ok){ showToast("OK!"); setMode('edit'); } else showToast(data.message,"error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    const handleSaveProfile = async (e) => { e.preventDefault(); setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/update-profile`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(editForm)}); const data=await res.json(); if(res.ok){ showToast("Cập nhật xong!"); setUser(data.user); setMode('view'); } else showToast(data.message,"error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    
    const handleRequestOTP = async () => { setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/request-otp`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}}); const data=await res.json(); showToast(data.message); setPassForm({otp:'',newPassword:'',confirmPassword:''}); setPassStep(2); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    const handleVerifyOTP = async (e) => { e.preventDefault(); setLoading(true); try { const res=await fetch(`${API_URL}/auth/check-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,otp:passForm.otp})}); if(res.ok) setPassStep(3); else showToast("OTP sai","error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    const handleChangePass = async (e) => { e.preventDefault(); if(passForm.newPassword!==passForm.confirmPassword) return showToast("Pass ko khớp","error"); setLoading(true); try { const token=localStorage.getItem('token'); const res=await fetch(`${API_URL}/user/change-password-otp`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({otp:passForm.otp,newPassword:passForm.newPassword})}); if(res.ok){showToast("Xong! Đăng nhập lại."); onLogout();} else showToast("Lỗi","error"); } catch(e){showToast("Lỗi","error");} finally{setLoading(false);} };
    const handleImageUpload = (e) => { const file = e.target.files[0]; if(file){ const reader=new FileReader(); reader.onloadend=()=>setEditForm({...editForm, avatar:reader.result}); reader.readAsDataURL(file); }};

    return (
        <div className="max-w-2xl mx-auto py-12"><div className="p-8 rounded-2xl shadow-lg border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <div className="flex items-center gap-6 mb-8"><img src={user.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-blue-500/20 object-cover" /><div><h2 className="text-2xl font-bold">{user.name}</h2><p className="text-gray-500">{maskEmail(user.email)}</p></div></div>
            {mode === 'view' && ( <>
                <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl"><div><label className="text-xs text-gray-500">SĐT</label><p className="font-medium">{maskPhone(user.phone)||"---"}</p></div><div><label className="text-xs text-gray-500">Ngày sinh</label><p className="font-medium">{user.dob||"---"}</p></div><div><label className="text-xs text-gray-500">Giới tính</label><p className="font-medium">{user.gender||"---"}</p></div><div><label className="text-xs text-gray-500">Địa chỉ</label><p className="font-medium">{user.address||"---"}</p></div></div>
                <div className="flex flex-col gap-3"><Button onClick={() => user.hasSecurityCode ? setMode('verify_security') : setMode('create_security')}>Chỉnh sửa thông tin</Button><Button variant="outline" onClick={() => setMode('change_pass')}>Đổi mật khẩu</Button><Button variant="secondary" className="text-red-500" onClick={onLogout}>Đăng xuất</Button></div>
                <div className="mt-8 pt-8 border-t dark:border-gray-700"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-green-600"/> Quản lý Mã Bảo Vệ</h3>{user.hasSecurityCode ? (<div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"><span className="text-green-700 dark:text-green-400 font-medium">Đã kích hoạt mã bảo vệ</span><Button variant="outline" className="text-sm" onClick={() => setMode('change_security')}>Đổi mã</Button></div>) : (<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg"><p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">Bạn chưa có mã bảo vệ. Hãy tạo ngay để bảo vệ thông tin cá nhân.</p><Button onClick={() => setMode('create_security')}>Tạo mã bảo vệ ngay</Button></div>)}</div>
            </> )}
            {mode === 'create_security' && ( <form onSubmit={handleCreateSecurity}><h3 className="font-bold mb-4">Tạo mã bảo vệ mới</h3><Input label="Mã mới" type="password" value={securityCode} onChange={e=>setSecurityCode(e.target.value)} icon={LockKeyhole} autoComplete="new-password"/><div className="flex gap-2"><Button type="submit">Tạo</Button><Button variant="secondary" onClick={()=>setMode('view')}>Hủy</Button></div></form> )}
            {mode === 'verify_security' && ( <form onSubmit={handleVerifySecurity}><h3 className="font-bold mb-4">Nhập mã bảo vệ</h3><Input label="Mã bảo vệ" type="password" value={securityCode} onChange={e=>setSecurityCode(e.target.value)} icon={LockKeyhole} autoComplete="new-password"/><div className="flex gap-2"><Button type="submit">Mở khóa</Button><Button variant="secondary" onClick={()=>setMode('view')}>Hủy</Button></div></form> )}
            {mode === 'edit' && ( <form onSubmit={handleSaveProfile} className="space-y-4"><h3 className="font-bold text-blue-600">Sửa thông tin</h3><div className="mb-4"><label className="block text-sm font-medium mb-1 dark:text-gray-300">Ảnh đại diện</label><input type="file" onChange={handleImageUpload} className="w-full text-sm dark:text-gray-300"/><img src={editForm.avatar} className="w-16 h-16 rounded-full mt-2 object-cover"/></div><Input label="Họ tên" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} /><div className="grid grid-cols-2 gap-4"><Input label="SĐT" type="tel" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})} /><Input label="Ngày sinh" type="date" value={editForm.dob} onChange={e=>setEditForm({...editForm,dob:e.target.value})} /></div><Input label="Địa chỉ" value={editForm.address} onChange={e=>setEditForm({...editForm,address:e.target.value})} /><div className="flex gap-2"><Button variant="secondary" onClick={()=>setMode('view')}>Hủy</Button><Button type="submit">Lưu</Button></div></form> )}
            {mode === 'change_pass' && ( <div><h3 className="font-bold mb-4">Đổi mật khẩu</h3>{passStep===1&&<Button onClick={handleRequestOTP} disabled={loading}>Gửi OTP</Button>}{passStep===2&&<div className="mt-4"><Input label="OTP" value={passForm.otp} onChange={e=>setPassForm({...passForm,otp:e.target.value})} /><Button onClick={handleVerifyOTP}>Xác thực</Button></div>}{passStep===3&&<div className="mt-4"><Input label="Mới" type="password" value={passForm.newPassword} onChange={e=>setPassForm({...passForm,newPassword:e.target.value})} /><Input label="Nhập lại" type="password" value={passForm.confirmPassword} onChange={e=>setPassForm({...passForm,confirmPassword:e.target.value})} /><Button onClick={handleChangePass}>Đổi</Button></div>}<div className="mt-4"><Button variant="secondary" onClick={()=>setMode('view')}>Quay lại</Button></div></div> )}
            {mode === 'change_security' && ( <div><h3 className="font-bold mb-4">Đổi mã bảo vệ</h3>{securityStep===1 && <Button onClick={handleRequestOTPSecurity} disabled={loading}>Gửi OTP xác thực</Button>}{securityStep===2 && (<form onSubmit={handleChangeSecurity} className="mt-4"><h4 className="font-bold mb-3 text-sm">Xác thực & Đổi mã</h4><Input label="Nhập OTP" value={otp} onChange={e=>setOtp(e.target.value)} icon={ShieldCheck} /><Input label="Mã bảo vệ mới" type="password" value={securityCode} onChange={e=>setSecurityCode(e.target.value)} icon={LockKeyhole} autoComplete="new-password"/><div className="flex gap-2"><Button type="submit" disabled={loading}>Lưu mã mới</Button><Button variant="ghost" onClick={()=>{setMode('view');setSecurityStep(1)}}>Hủy</Button></div></form>)}{securityStep===1 && <div className="mt-2"><Button variant="secondary" onClick={()=>setMode('view')}>Hủy</Button></div>}</div> )}
        </div></div>
    );
};

const AdminDashboard = ({ user, apiCall, showToast }) => {
    const [activeTab, setActiveTab] = useState('users'); const [dataList, setDataList] = useState([]); const [showModal, setShowModal] = useState(false); const [editingItem, setEditingItem] = useState(null);
    const fetchData = async () => { try { const endpoint = activeTab === 'posts' ? '/posts' : '/users'; const data = await apiCall(endpoint); setDataList(data); } catch (error) { showToast("Lỗi tải", "danger"); } }; useEffect(() => { fetchData(); }, [activeTab]);
    const handleDelete = async (id) => { if(!window.confirm("Xóa?")) return; try { await apiCall(`/${activeTab}/${id}`, 'DELETE'); showToast("Đã xóa!"); fetchData(); } catch (e) { showToast(e.message, "danger"); } };
    const handleSave = async (formData) => { try { const endpoint = activeTab === 'posts' ? '/posts' : '/users'; if (editingItem) await apiCall(`${endpoint}/${editingItem.id}`, 'PUT', formData); else await apiCall(endpoint, 'POST', formData); showToast("Xong!"); setShowModal(false); fetchData(); } catch (e) { showToast(e.message, "danger"); } };
    return ( <div className="max-w-7xl mx-auto py-8 px-4"><div className="flex justify-between mb-8"><h2 className="text-2xl font-bold dark:text-white">Admin</h2><div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded"><button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded ${activeTab === 'posts' ? 'bg-white shadow' : ''}`}>Bài Viết</button><button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-white shadow' : ''}`}>User</button></div></div><div className="flex justify-end mb-4"><Button icon={Plus} onClick={() => { setEditingItem(null); setShowModal(true); }}>Thêm</Button></div><div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-700"> {activeTab==='posts'?(<><th className="p-3">Tiêu đề</th><th className="p-3">Mục</th></>):(<><th className="p-3">User</th><th className="p-3">Info</th></>)} <th className="p-3 text-right">Action</th> </tr></thead><tbody className="divide-y dark:divide-gray-700">{dataList.map((i)=>(<tr key={i.id}>{activeTab==='posts'?(<><td className="p-3 truncate max-w-xs">{i.title}</td><td className="p-3">{i.category}</td></>):(<><td className="p-3"><div>{i.name}</div><div className="text-xs text-gray-500">{maskEmail(i.email)}</div></td><td className="p-3"><div className="text-xs">{maskPhone(i.phone)}</div></td></>)}<td className="p-3 flex justify-end gap-2"><Button variant="secondary" className="!p-1" onClick={()=>{setEditingItem(i);setShowModal(true)}}><Edit2 className="w-4 h-4"/></Button><Button variant="danger" className="!p-1" onClick={()=>handleDelete(i.id)}><Trash2 className="w-4 h-4"/></Button></td></tr>))}</tbody></table></div>{showModal && (activeTab === 'posts' ? <PostFormModal onClose={() => setShowModal(false)} onSubmit={handleSave} initialData={editingItem} /> : <UserFormModal onClose={() => setShowModal(false)} onSubmit={handleSave} initialData={editingItem} />)}</div> );
};
const CategoryPage = ({ category, posts, onPostClick, user, onDelete, onEdit }) => { const filteredPosts = posts.filter(p => p.category === category); return ( <div className="py-8"><h2 className="text-3xl font-bold mb-6 border-l-4 border-blue-600 pl-4 dark:text-white">{category}</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{filteredPosts.map((post, idx) => (<motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 relative"><div className="overflow-hidden h-48 relative" onClick={() => onPostClick(post)}><img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /><div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">{post.views} lượt xem</div></div>{user?.role === 'admin' && (<div className="absolute top-2 left-2 flex gap-1 z-10"><button onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="p-1.5 bg-white rounded-full shadow hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="p-1.5 bg-white rounded-full shadow hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button></div>)}<div className="p-5" onClick={() => onPostClick(post)}><div className="flex items-center gap-2 mb-3"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">{post.category}</span><span className="text-xs text-gray-500 dark:text-gray-400">• {post.date}</span></div><h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors dark:text-white text-gray-900">{post.title}</h3><p className="text-sm line-clamp-2 mb-4 dark:text-gray-400 text-gray-600">{post.summary}</p></div></motion.div>))}</div></div> ); };

// --- MAIN APP ---
export default function NewsApp() {
  const [darkMode, setDarkMode] = useState(false); const [currentPage, setCurrentPage] = useState('home'); const [selectedCategory, setSelectedCategory] = useState(null); const [user, setUser] = useState(null); const [selectedPost, setSelectedPost] = useState(null); const [posts, setPosts] = useState(FALLBACK_POSTS); const [loading, setLoading] = useState(false); const [toast, setToast] = useState(null); const [showTerms, setShowTerms] = useState(false); const [showPostModal, setShowPostModal] = useState(false); const [editingPost, setEditingPost] = useState(null); const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '', name: '', otp: '', phone: '', address: '', dob: '', gender: 'Nam', rememberMe: false, agreeTerms: false }); const [authError, setAuthError] = useState({}); const [otpVerified, setOtpVerified] = useState(false);
  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };
  const apiCall = async (endpoint, method = 'GET', body = null) => { if (USE_MOCK_API && method === 'GET') return { success: true }; try { const headers = { 'Content-Type': 'application/json' }; const token = localStorage.getItem('token'); if (token) headers['Authorization'] = `Bearer ${token}`; 
 // Thêm chữ /api vào giữa API_URL và endpoint
const res = await fetch(`${API_URL}/api${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });; const contentType = res.headers.get("content-type"); if (!contentType || !contentType.includes("application/json")) throw new Error("Lỗi Server"); const data = await res.json(); if (!res.ok) throw new Error(data.message); return data; } catch (err) { throw err; } };
  const fetchPosts = async () => { try { const data = await apiCall('/posts'); setPosts(data); } catch (err) {} }; useEffect(() => { fetchPosts(); }, []);
  const handleSavePost = async (data) => { try { if(editingPost) await apiCall(`/posts/${editingPost.id}`,'PUT',data); else await apiCall('/posts','POST',data); showToast("Xong"); setShowPostModal(false); fetchPosts(); } catch(e){showToast(e.message,"error")} };
  const handleDeletePost = async (id) => { if(!confirm("Xóa?")) return; try { await apiCall(`/posts/${id}`,'DELETE'); showToast("Đã xóa"); fetchPosts(); } catch(e){showToast(e.message,"error")} };
  const openEditModal = (post) => { setEditingPost(post); setShowPostModal(true); };
  const handleVerifyOtpOnly = async (e) => { e.preventDefault(); setLoading(true); setAuthError({}); try { await apiCall('/auth/check-otp', 'POST', { email: authForm.email, otp: authForm.otp }); setOtpVerified(true); } catch (err) { setAuthError({ otp: err.message }); } finally { setLoading(false); } };
  const handleResendOtp = async () => { setLoading(true); try { const endpoint = currentPage === 'otp' ? '/auth/register' : '/auth/forgot-password'; const body = currentPage === 'otp' ? { name: authForm.name, email: authForm.email, password: authForm.password } : { email: authForm.email }; const data = await apiCall(endpoint, 'POST', body); showToast(data.message); } catch (err) { showToast("Lỗi gửi lại OTP", "error"); } finally { setLoading(false); } };
  const handleAuthSubmit = async (e) => { e.preventDefault(); setLoading(true); setAuthError({}); if ((currentPage === 'register' || (currentPage === 'reset' && otpVerified)) && authForm.password !== authForm.confirmPassword) { setAuthError({ confirmPassword: "Mật khẩu không khớp" }); setLoading(false); return; } try { if(currentPage==='register'){ await apiCall('/auth/register','POST',authForm); setCurrentPage('otp'); } else if(currentPage==='otp'){ await apiCall('/auth/verify-otp','POST',{email:authForm.email,otp:authForm.otp}); setCurrentPage('login'); } else if(currentPage==='login'){ const data=await apiCall('/auth/login','POST',{email:authForm.email,password:authForm.password}); setUser(data.user); setCurrentPage('home'); localStorage.setItem('token',data.token); } else if(currentPage==='forgot'){ await apiCall('/auth/forgot-password','POST',{email:authForm.email}); setCurrentPage('reset'); } else if(currentPage==='reset'){ await apiCall('/auth/reset-password','POST',{email:authForm.email,otp:authForm.otp,newPassword:authForm.password}); setCurrentPage('login'); } } catch(e){ const msg = e.message; if (msg.toLowerCase().includes('mật khẩu')) setAuthError({ password: msg }); else if (msg.toLowerCase().includes('otp')) setAuthError({ otp: msg }); else setAuthError({ form: msg }); } finally{ setLoading(false); } };
  const handleLogout = () => { setUser(null); setCurrentPage('home'); localStorage.removeItem('token'); };
  const switchMode = (mode) => { setCurrentPage(mode); setAuthError({}); setAuthForm(prev => ({ ...prev, email: localStorage.getItem('savedEmail') || '', password: '', confirmPassword: '', otp: '', phone: '', address: '', dob: '', gender: 'Nam' })); };
  const handleCategoryClick = (category) => { setSelectedCategory(category); setCurrentPage('category'); };
  const goHome = () => { setSelectedCategory(null); setCurrentPage('home'); }
  const handlePostClick = (post) => { if(!user) { showToast("Vui lòng đăng nhập để xem nội dung chi tiết!", "error"); switchMode('login'); return; } setSelectedPost(post); setCurrentPage('detail'); };
  useEffect(() => { const saved = localStorage.getItem('savedEmail'); if(saved) setAuthForm(p=>({...p, email: saved, rememberMe: true})); }, []);
  const renderPosts = (postList) => ( <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{postList.map((post, idx) => (<motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 relative"><div className="overflow-hidden h-48 relative" onClick={() => handlePostClick(post)}><img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /><div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">{post.views} lượt xem</div></div>{user?.role === 'admin' && (<div className="absolute top-2 left-2 flex gap-1 z-10"><button onClick={(e) => { e.stopPropagation(); openEditModal(post); }} className="p-1.5 bg-white rounded-full shadow hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} className="p-1.5 bg-white rounded-full shadow hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button></div>)}<div className="p-5" onClick={() => handlePostClick(post)}><div className="flex items-center gap-2 mb-3"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">{post.category}</span><span className="text-xs text-gray-500 dark:text-gray-400">• {post.date}</span></div><h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors dark:text-white text-gray-900">{post.title}</h3><p className="text-sm line-clamp-2 mb-4 dark:text-gray-400 text-gray-600">{post.summary}</p></div></motion.div>))}</div> );

  return ( <div className={`min-h-screen font-sans ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}><header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 border-b px-4 h-16 flex items-center justify-between"><div className="flex items-center gap-2 cursor-pointer" onClick={()=>{setCurrentPage('home');setSelectedCategory(null)}}><div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold">N</div><span className="font-bold text-xl">NewsDaily</span></div><nav className="flex gap-6">{CATEGORIES.map(c=><button key={c} onClick={()=>{setSelectedCategory(c);setCurrentPage('category')}} className="hover:text-blue-600">{c}</button>)}</nav><div className="flex gap-3"><button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">{darkMode?<Sun/>:<Moon/>}</button>{user?(<div className="flex items-center gap-3">{user.role==='admin'&&<Button onClick={()=>setCurrentPage('admin')} variant="outline" className="!px-2 !py-1 text-xs"><LayoutDashboard className="w-4 h-4"/></Button>}<div className="flex gap-2 cursor-pointer" onClick={()=>setCurrentPage('profile')}><img src={user.avatar} className="w-8 h-8 rounded-full object-cover"/><span>{user.name}</span></div></div>):(<><button onClick={()=>switchMode('login')} className="text-sm hover:text-blue-600">Đăng nhập</button><Button onClick={()=>switchMode('register')} icon={LogIn}>Đăng ký</Button></>)}</div></header><AnimatePresence>{toast&&<div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">{toast.message}</div>}</AnimatePresence><main className="container mx-auto px-4 py-6 min-h-screen">{currentPage==='home' && <><section className="py-8">{posts.length>0&&<div className="grid lg:grid-cols-3 gap-6 mb-8"><motion.div initial={{opacity:0}} animate={{opacity:1}} className="lg:col-span-2 relative rounded-xl overflow-hidden shadow-lg cursor-pointer" onClick={()=>{handlePostClick(posts[0])}}><img src={posts[0].image} className="w-full h-[400px] object-cover"/><div className="absolute bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent w-full text-white"><span className="bg-green-600 px-2 py-1 text-xs rounded">{posts[0].category}</span><h2 className="text-3xl font-bold mt-2">{posts[0].title}</h2></div></motion.div><div className="flex flex-col gap-4">{posts.slice(1,3).map(p=><div key={p.id} className="flex gap-4 cursor-pointer" onClick={()=>{handlePostClick(p)}}><img src={p.image} className="w-1/3 rounded object-cover"/><div><span className="text-blue-600 text-xs font-bold">{p.category}</span><h3 className="font-bold text-sm">{p.title}</h3></div></div>)}</div></div>} {renderPosts(posts.slice(3))}</section></>}{currentPage==='category' && <CategoryPage category={selectedCategory} posts={posts} onPostClick={handlePostClick} user={user} onDelete={handleDeletePost} onEdit={openEditModal}/>}{currentPage==='detail' && selectedPost && <div className="max-w-4xl mx-auto py-8"><button onClick={()=>setCurrentPage('home')}>Back</button>{user?.role==='admin'&&<div className="flex gap-2 mt-4"><Button onClick={()=>openEditModal(selectedPost)}>Sửa</Button><Button variant="danger" onClick={()=>handleDeletePost(selectedPost.id)}>Xóa</Button></div>}<h1 className="text-4xl font-bold mt-4">{selectedPost.title}</h1><img src={selectedPost.image} className="w-full rounded my-6"/><p className="whitespace-pre-line">{selectedPost.content}</p></div>}{['login','register','otp','forgot','reset'].includes(currentPage) && <AuthForm type={currentPage} formData={authForm} setFormData={setAuthForm} loading={loading} errors={authError} onSubmit={handleAuthSubmit} onSwitchMode={switchMode} darkMode={darkMode} otpVerified={otpVerified} setOtpVerified={setOtpVerified} onVerifyOtpOnly={handleVerifyOtpOnly} onResendOtp={handleResendOtp} onOpenTerms={() => setShowTerms(true)} onForgotPassword={() => switchMode('forgot')} />}{currentPage==='profile' && user && <UserProfile user={user} setUser={setUser} onLogout={handleLogout} showToast={showToast} />}{currentPage==='admin' && <AdminDashboard user={user} apiCall={apiCall} showToast={showToast} />}</main>{user?.role==='admin'&&currentPage!=='admin'&&<button onClick={()=>{setEditingPost(null);setShowPostModal(true)}} className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"><Plus/></button>}{showPostModal && <PostFormModal onClose={()=>setShowPostModal(false)} onSubmit={handleSavePost} initialData={editingPost}/>}{showTerms && <TermsModal onClose={() => setShowTerms(false)} />}</div> );
}