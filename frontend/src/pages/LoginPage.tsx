import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/ui/Alert';
import { ShieldCheck, Lock, UserCheck } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Please enter a valid government email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().optional(),
  department: z.string().optional(),
});

type AuthForm = z.infer<typeof authSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: 'auditor@contractguard.gov',
      password: 'AuditGuard2026!',
      full_name: '',
      department: '',
    },
  });

  const onSubmit = async (data: AuthForm) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      if (isRegistering) {
        if (!data.full_name?.trim()) {
          setAuthError('Please enter your full name to create an account.');
          return;
        }
        await authService.register({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          department: data.department,
        });
      } else {
        await authService.login(data.email, data.password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'auditor' | 'admin') => {
    if (role === 'auditor') {
      setValue('email', 'auditor@contractguard.gov');
      setValue('password', 'AuditGuard2026!');
    } else {
      setValue('email', 'admin@contractguard.gov');
      setValue('password', 'AdminGuard2026!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {isRegistering ? 'Create your audit account' : 'Official Sign In'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isRegistering
            ? 'Set up a local account to access contract oversight tools.'
            : 'Access the post-award procurement audit and compliance verification terminal.'}
        </p>
      </div>

      {authError && (
        <AlertBanner type="danger" title="Access Denied">
          {authError}
        </AlertBanner>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isRegistering && (
          <>
            <Input
              label="Full Name"
              placeholder="Your full name"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <Input
              label="Department (Optional)"
              placeholder="Procurement or audit department"
              {...register('department')}
            />
          </>
        )}
        <Input
          label="Email"
          type="email"
          placeholder="officer@contractguard.gov"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password / Security Credential"
          type="password"
          placeholder="••••••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
        >
          {isRegistering ? <UserCheck className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
          {isRegistering ? 'Create Account' : 'Sign In to Audit Terminal'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setIsRegistering(!isRegistering);
          setAuthError(null);
        }}
        className="w-full text-xs font-semibold text-slate-700 hover:text-slate-950"
      >
        {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>

      {/* Demo Credentials Switcher */}
      {!isRegistering && <div className="pt-4 border-t border-slate-200">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Demo Environment Quick Access:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDemoCredentials('auditor')}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left text-xs transition-colors"
          >
            <span className="font-semibold block text-slate-800">Lead Auditor</span>
            <span className="text-[10px] text-slate-500">auditor@contractguard.gov</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('admin')}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left text-xs transition-colors"
          >
            <span className="font-semibold block text-slate-800">System Admin</span>
            <span className="text-[10px] text-slate-500">admin@contractguard.gov</span>
          </button>
        </div>
      </div>}
    </div>
  );
};
