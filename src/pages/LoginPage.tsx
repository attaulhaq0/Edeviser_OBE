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
import { Loader2, Mail, Lock } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="bg-white border-0 shadow-md rounded-xl w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t('login.welcomeTitle')}
          </CardTitle>
          <CardDescription>
            {t('login.welcomeSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.emailLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder={t('login.emailPlaceholder')}
                          className="pl-9"
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
                      <FormLabel>{t('login.passwordLabel')}</FormLabel>
                      <Link
                        to="/reset-password"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
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
                          className="pl-9"
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
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('login.submitButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
