
import React, { useState } from 'react';
import { Lock, User, Loader2, AlertCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';
import { UserRole } from '../types';

interface LoginProps {
    onLoginSuccess: (user: { username: string, role: UserRole, fullName: string, token: string }) => void;
    isDarkMode: boolean;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, isDarkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.setupDefaults(); 
            const data = await api.login(username, password);
            // Simulate a sleek delay for animation smoothness
            setTimeout(() => {
                onLoginSuccess({
                    username: username,
                    role: data.role,
                    fullName: data.full_name,
                    token: data.access_token
                });
            }, 500);
        } catch (err: any) {
            setError(err.message || 'Gagal login');
            setIsLoading(false);
        }
    };

    // Dynamic Styles based on Mode
    const bgGradient = isDarkMode 
        ? 'from-slate-900 via-blue-950 to-slate-900' 
        : 'from-blue-50 via-indigo-50 to-white';
    
    const cardClass = isDarkMode
        ? 'bg-slate-900/60 border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]'
        : 'bg-white/70 border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)]';

    const textPrimary = isDarkMode ? 'text-white' : 'text-slate-800';
    const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    const labelColor = isDarkMode ? 'text-blue-300' : 'text-blue-700';

    const inputBg = isDarkMode ? 'bg-slate-800/50' : 'bg-white/60';
    const inputBorder = isDarkMode ? 'border-slate-700' : 'border-slate-200';
    const inputText = isDarkMode ? 'text-white placeholder-slate-600' : 'text-slate-800 placeholder-slate-400';
    const iconColor = isDarkMode ? 'text-slate-500' : 'text-slate-400';

    return (
        <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${bgGradient} p-4 relative overflow-hidden transition-colors duration-500`}>
            
            {/* Ambient Background Elements */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-30 animate-pulse ${isDarkMode ? 'bg-blue-600' : 'bg-blue-300'}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full blur-[100px] opacity-20 animate-pulse delay-1000 ${isDarkMode ? 'bg-purple-600' : 'bg-indigo-300'}`}></div>

            <div className={`relative backdrop-blur-xl border rounded-3xl w-full max-w-md overflow-hidden transition-all duration-300 ${cardClass}`}>
                
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

                <div className="p-8 md:p-10 relative z-10">
                    <div className="text-center mb-10">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                            <Sparkles className="text-white w-8 h-8" />
                        </div>
                        <h1 className={`text-3xl font-bold tracking-tight mb-2 ${textPrimary}`}>NIFILI</h1>
                        <p className={`text-sm font-medium tracking-wide uppercase opacity-80 ${textSecondary}`}>Sistem Perencanaan Anggaran</p>
                    </div>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm backdrop-blur-sm animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="group">
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 transition-colors ${focusedField === 'username' ? labelColor : textSecondary}`}>Username</label>
                            <div className="relative transition-transform duration-300 focus-within:scale-[1.02]">
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${focusedField === 'username' ? 'text-blue-500' : iconColor}`}>
                                    <User size={20} />
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-300 shadow-sm ${inputBg} ${inputBorder} ${inputText} focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`}
                                    placeholder="Masukkan ID Pengguna"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="group">
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 transition-colors ${focusedField === 'password' ? labelColor : textSecondary}`}>Password</label>
                            <div className="relative transition-transform duration-300 focus-within:scale-[1.02]">
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${focusedField === 'password' ? 'text-blue-500' : iconColor}`}>
                                    <Lock size={20} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl border outline-none transition-all duration-300 shadow-sm ${inputBg} ${inputBorder} ${inputText} focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`}
                                    placeholder="Masukkan Kata Sandi"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer transition-colors ${focusedField === 'password' ? 'text-blue-500' : iconColor} hover:text-blue-600`}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full group relative overflow-hidden rounded-xl font-bold py-4 transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk Aplikasi</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                            {/* Button Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-dashed border-gray-300/30 text-center">
                        <p className={`text-xs ${textSecondary}`}>Kredensial Default (Demo):</p>
                        <div className={`mt-2 text-xs font-mono p-3 rounded-lg ${isDarkMode ? 'bg-black/30 text-slate-300' : 'bg-gray-100 text-slate-600'}`}>
                            <div className="flex justify-between mb-1"><span>PPK:</span> <strong>ppk_user / ppk123</strong></div>
                            <div className="flex justify-between"><span>Operator:</span> <strong>operator_user / operator123</strong></div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className={`absolute bottom-4 text-[10px] opacity-50 ${textPrimary}`}>
                &copy; {new Date().getFullYear()} NIFILI - Secure Budgeting System
            </div>
        </div>
    );
};

export default Login;
