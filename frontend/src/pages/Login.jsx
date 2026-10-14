import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, fieldErrors } from '../lib/api';
import Logo from '../components/Logo';
import { Avatar, Button, Field, Input } from '../components/ui';

const DEMO_PASSWORD = { admin: 'admin123', author: 'author123' };

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    api
      .get('/auth/demo-accounts')
      .then((res) => setAccounts(res.data.data))
      .catch(() => setAccounts([]));
  }, []);

  const signIn = async (e, creds) => {
    e?.preventDefault();
    const target = creds || { email, password };
    setSubmitting(creds ? target.email : 'form');
    setError('');
    setErrors({});
    try {
      await login(target.email, target.password);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err.details?.length ? '' : err.message);
      setSubmitting(null);
    }
  };

  const admins = accounts.filter((a) => a.role === 'admin');
  const authors = accounts.filter((a) => a.role === 'author');

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-leaf-800 text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,transparent,transparent_31px,#f7f5f0_31px,#f7f5f0_32px)]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-leaf-500/20 blur-3xl" />
        <Logo className="relative [&_p]:text-paper [&_p:last-child]:text-paper/60 [&_svg]:ring-1 [&_svg]:ring-paper/25 [&_svg]:rounded-lg" subtitle="Author support" />

        <div className="relative max-w-md">
          <p className="font-display text-[40px] leading-[1.1]">Every author deserves a straight answer, fast.</p>
          <p className="mt-6 text-[15px] leading-relaxed text-paper/70">
            Track your books and royalties, raise a query in a minute, and see our team's reply the moment it is sent.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-paper/15 pt-6 text-[13px]">
          {[
            ['22,000+', 'titles in catalogue'],
            ['1,200+', 'books published monthly'],
            ['80%', 'of net profit to authors'],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="num font-display text-[22px] text-paper">{n}</dt>
              <dd className="mt-1 text-paper/60">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px] animate-fade-up">
          <Logo className="mb-10 lg:hidden" subtitle="Author support" />
          <h1 className="font-display text-[30px]">Sign in</h1>
          <p className="mt-1.5 text-ink-muted">Use the email registered with BookLeaf.</p>

          <form onSubmit={signIn} className="mt-8 space-y-4" noValidate>
            {error && <div className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2.5 text-[13px] text-clay-700">{error}</div>}
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} placeholder="you@example.com" />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password}>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={submitting === 'form'}>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {accounts.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="eyebrow">Demo accounts</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="mt-4 space-y-1.5">
                {admins.slice(0, 1).map((a) => (
                  <DemoRow key={a.email} account={a} busy={submitting === a.email} onClick={() => signIn(null, { email: a.email, password: DEMO_PASSWORD.admin })} />
                ))}
              </div>

              <details className="group mt-1.5">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 text-[13px] text-ink-muted transition hover:bg-ink/[0.03] hover:text-ink">
                  <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                  {authors.length} author accounts
                </summary>
                <div className="mt-1 max-h-72 space-y-1 overflow-y-auto pr-1">
                  {authors.map((a) => (
                    <DemoRow key={a.email} account={a} busy={submitting === a.email} onClick={() => signIn(null, { email: a.email, password: DEMO_PASSWORD.author })} />
                  ))}
                </div>
              </details>
              <p className="mt-3 px-3 text-[12px] text-ink-faint">
                Passwords: <span className="font-mono">admin123</span> for staff, <span className="font-mono">author123</span> for authors.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DemoRow({ account, onClick, busy }) {
  const isAdmin = account.role === 'admin';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-line hover:bg-white hover:shadow-card disabled:opacity-60"
    >
      <Avatar name={account.name} size="sm" tone={isAdmin ? 'ink' : 'leaf'} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium">
          {account.name}
          {isAdmin && <span className="ml-2 text-[11px] font-normal text-ink-muted">Support team</span>}
        </p>
        <p className="truncate text-[12px] text-ink-muted">{account.email}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}
