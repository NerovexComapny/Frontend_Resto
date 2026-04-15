import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import logo from '../../assets/logo.webp';
import backgroundImg from '../../assets/background.png';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';

const LoginPage = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const onSubmit = async ({ email, password }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      login(user, token);

      switch (user?.role) {
        case 'manager':
        case 'superadmin':
          navigate('/manager/dashboard');
          break;
        case 'waiter':
          navigate('/waiter/orders');
          break;
        case 'cashier':
          navigate('/cashier/payments');
          break;
        case 'cook':
        case 'kitchen':
          navigate('/kitchen');
          break;
        default:
          navigate('/menu');
          break;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('auth.loginFailed'));
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div className="absolute inset-0 bg-[#0a1628]/70 backdrop-blur-[2px]" />

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-[#0d1f3c]/80 backdrop-blur-xl border border-[#0000003A]/30 rounded-2xl p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md mx-4 shadow-2xl z-10 relative"
      >
        <img src={logo} alt="ليالي قرطاج" className="restaurant-logo-circle w-14 h-14 mx-auto mb-4" />

        <h1 dir="rtl" className="text-2xl md:text-3xl font-bold text-[#0B95E6] text-center font-serif mb-1">
          ليالي قرطاج
        </h1>
        <p className="text-sm text-[#94a3b8] text-center mb-8">{t('common.fineCuisine')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <input
                type="email"
                placeholder={t('auth.email')}
                className={`w-full text-base py-3 px-4 pl-10 bg-[#132845] border rounded-xl text-[#f0f4f8] placeholder:text-[#94a3b8] outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] ${errors.email ? 'border-red-400' : 'border-[#1e3a5f]'}`}
                {...register('email', { required: t('auth.emailRequired') })}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                className={`w-full text-base py-3 px-4 pl-10 pr-12 bg-[#132845] border rounded-xl text-[#f0f4f8] placeholder:text-[#94a3b8] outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] ${errors.password ? 'border-red-400' : 'border-[#1e3a5f]'}`}
                {...register('password', { required: t('auth.passwordRequired') })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f0f4f8]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0B95E6] hover:bg-[#160774] text-[#0a1628] text-base font-bold rounded-xl py-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>
      </Motion.div>
    </div>
  );
};

export default LoginPage;
