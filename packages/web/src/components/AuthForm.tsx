import { FetchError } from 'ofetch';
import { useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import {
  type AuthLoginRequest,
  AuthLoginRequestSchema,
  type AuthLoginResponse,
  type AuthRegisterRequest,
  AuthRegisterRequestSchema,
  type AuthRegisterResponse,
} from 'types/Auth.ts';
import { useLocation } from 'wouter';
import { login, registerUser, TOKEN_KEY } from '../api.ts';

type AuthFormProps = {
  className?: string;
  registering: boolean;
  onRegistered: () => void;
};

export const AuthForm = ({ className, registering, onRegistered }: AuthFormProps) => {
  const [, navigate] = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthRegisterRequest>();

  const loginMutation = useSWRMutation<AuthLoginResponse, Error, string, AuthLoginRequest>('/auth/login', login);

  const registerMutation = useSWRMutation<AuthRegisterResponse, Error, string, AuthRegisterRequest>(
    '/auth/register',
    registerUser,
  );

  const submit = async (params: AuthRegisterRequest) => {
    const schema = registering ? AuthRegisterRequestSchema : AuthLoginRequestSchema;
    const parsed = schema.safeParse(params);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (field === 'email' || field === 'password' || field === 'name') setError(field, { message: issue.message });
      }

      return;
    }

    let accountCreated = false;

    try {
      if (registering) {
        await registerMutation.trigger(params);
        accountCreated = true;
      }

      const response = await loginMutation.trigger({
        email: params.email,
        password: params.password,
      });

      localStorage.setItem(TOKEN_KEY, response.token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (accountCreated) {
        onRegistered();

        return;
      }

      let message = 'Unable to continue. Please try again.';

      if (error instanceof FetchError && error.status === 401) message = 'Invalid email or password.';

      if (error instanceof FetchError && error.status === 409) message = 'Email already registered. Sign in instead.';
      setError('root', { message });
    }
  };

  return (
    <form className={className} onSubmit={handleSubmit(submit)}>
      <div className="space-y-5">
        {registering && (
          <label className="block">
            Name
            <input className="auth-input" autoComplete="name" required maxLength={100} {...register('name')} />
            {errors.name && <span role="alert">{errors.name.message}</span>}
          </label>
        )}
        <label className="block">
          Email
          <input className="auth-input" type="email" autoComplete="email" required {...register('email')} />
          {errors.email && <span role="alert">{errors.email.message}</span>}
        </label>
        <label className="block">
          Password
          <input
            className="auth-input"
            type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            required
            minLength={8}
            maxLength={50}
            {...register('password')}
          />
          {errors.password && <span role="alert">{errors.password.message}</span>}
        </label>
        {errors.root && (
          <p role="alert" className="text-sm text-red-700">
            {errors.root.message}
          </p>
        )}
        <button className="auth-button w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
          {registering ? 'Create account' : 'Sign in'}
        </button>
      </div>
    </form>
  );
};
