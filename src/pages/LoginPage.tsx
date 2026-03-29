import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth';
import { useAuth } from '@/hooks/useAuth';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mail, Lock, GraduationCap, Target, TrendingUp, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const { t } = useTranslation('auth');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await signIn(data.email, data.password);
      if (!result.success) {
        setError(result.error ?? t('login.defaultError'));
        return;
      }
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch {
      setError(t('login.genericError'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Edeviser</span>
          </div>
          <p className="text-sm text-white/60">Outcome-Based Education Platform</p>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold leading-tight">
            Empowering educators.<br />Engaging students.<br />Elevating outcomes.
          </h2>
          <div className="space-y-4">
            {[
              { icon: Target, text: 'OBE curriculum mapping with ILO → PLO → CLO alignment' },
              { icon: TrendingUp, text: 'Real-time attainment tracking and analytics' },
              { icon: Sparkles, text: 'AI-powered insights and gamified learning' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-teal-300" />
                </div>
                <p className="text-sm text-white/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">© 2026 Edeviser. All rights reserved.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Edeviser</span>
          </div>

          <Card className="bg-white border border-slate-200 shadow-lg rounded-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                {t('login.welcomeTitle')}
              </CardTitle>
              <CardDescription className="text-gray-500">
                {t('login.welcomeSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <span className="text-red-500 text-xs font-bold">!</span>
                      </div>
                      {error}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">{t('login.emailLabel')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="email"
                              placeholder={t('login.emailPlaceholder')}
                              className="pl-10 h-11 border-slate-300 focus:border-blue-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-gray-700 font-medium">{t('login.passwordLabel')}</FormLabel>
                          <Link
                            to="/reset-password"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {t('login.forgotPassword')}
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="password"
                              placeholder={t('login.passwordPlaceholder')}
                              className="pl-10 h-11 border-slate-300 focus:border-blue-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 text-base font-semibold bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 active:scale-[0.98] transition-all shadow-md"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t('login.submitButton')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure login powered by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
