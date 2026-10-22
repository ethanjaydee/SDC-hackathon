import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowRight, LoaderCircle, Radio } from 'lucide-react';
import { Redirect, Route, Router as WouterRouter, Switch, Link, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { queryDefaults } from '@/lib/reliability';
import Dashboard from '@/components/dispatch/Dashboard.tsx';
import { ThemeProvider, ThemeToggle } from '@/components/dispatch/theme.tsx';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: queryDefaults });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside',
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#c84224',
    colorForeground: '#25282c',
    colorMutedForeground: '#686c70',
    colorDanger: '#b4233a',
    colorBackground: '#fbfaf7',
    colorInput: '#ffffff',
    colorInputForeground: '#25282c',
    colorNeutral: '#dedad3',
    fontFamily: 'Geist, ui-sans-serif, sans-serif',
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf7] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e8e5df] shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#25282c] font-semibold',
    headerSubtitle: 'text-[#686c70]',
    socialButtonsBlockButtonText: 'text-[#25282c] font-medium',
    formFieldLabel: 'text-[#25282c] font-medium',
    footerActionLink: 'text-[#c84224] font-medium',
    footerActionText: 'text-[#686c70]',
    dividerText: 'text-[#686c70]',
    identityPreviewEditButton: 'text-[#c84224]',
    formFieldSuccessText: 'text-[#166a4b]',
    alertText: 'text-[#25282c]',
    logoBox: 'bg-transparent',
    logoImage: 'h-8 w-8',
    socialButtonsBlockButton: 'border border-[#dedad3] bg-white rounded-lg',
    formButtonPrimary: 'bg-[#c84224] hover:bg-[#a83319] text-white rounded-lg',
    formFieldInput: 'bg-white border border-[#d5d1ca] text-[#25282c] placeholder:text-[#82868a] rounded-lg focus:border-[#c84224]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#dedad3]',
    alert: 'bg-[#fff3ef] border border-[#e7b7a9] rounded-lg',
    otpCodeFieldInput: 'border border-[#d5d1ca] text-[#25282c] bg-white rounded-md',
    formFieldRow: 'gap-1',
    main: 'gap-4',
  },
};

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Radio size={17} strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Dispatch Hub</span>
    </span>
  );
}

function PublicHome() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost"><Link href="/sign-in">Sign in</Link></Button>
          <Button asChild><Link href="/sign-up">Create account</Link></Button>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100dvh-88px)] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_.9fr]">
        <section className="max-w-2xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">Field service workspace</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            The right job details, ready for the road.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in to check technician availability, van stock, customer repair notes and dispatch history in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link href="/sign-in">Open Dispatch Hub <ArrowRight size={16} /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/sign-up">Create an account</Link></Button>
          </div>
          <p className="mt-8 max-w-lg text-xs leading-relaxed text-muted-foreground">
            Demo workspace: signed-in accounts share synthetic dispatch records. Do not enter real customer or personal data.
          </p>
        </section>
        <section aria-label="Dispatch Hub preview" className="rounded-2xl border bg-card p-5 shadow-lg sm:p-7">
          <div className="flex items-center justify-between border-b pb-4">
            <div><p className="text-sm font-semibold">Today at a glance</p><p className="mt-1 text-xs text-muted-foreground">Sample dispatch workspace</p></div>
            <span className="rounded-full border border-ok/25 bg-ok/10 px-2.5 py-1 text-xs text-ok">Ready</span>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-2">
            {[['Technicians', 'Availability at a glance'], ['Van stock', 'Parts ready for the job'], ['Customer notes', 'Repair details in one view'], ['Dispatch history', 'Completed work, recorded']].map(([title, text]) => (
              <div key={title} className="rounded-xl border bg-background/70 p-4">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="border-t pt-4 text-xs text-muted-foreground">Synthetic demo data · Sign in to continue</p>
        </section>
      </main>
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background" role="status" aria-label="Loading sign-in">
      <LoaderCircle size={22} className="animate-spin text-primary" />
    </div>
  );
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return isSignedIn ? <Dashboard /> : <PublicHome />;
}

function ProtectedDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return isSignedIn ? <Dashboard /> : <Redirect to="/" />;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const previousUserId = useRef(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        cache.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, cache]);

  return null;
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to your field workspace' } },
        signUp: { start: { title: 'Create your account', subtitle: 'Get started with Dispatch Hub' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={ProtectedDashboard} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <AppRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
