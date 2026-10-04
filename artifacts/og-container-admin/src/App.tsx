import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  setBaseUrl,
  useAdminSessionLogin,
  useAdminSessionLogout,
  useAdminSessionTwoFactorResend,
  useAdminSessionTwoFactorVerify,
  useCreateAdminProjectTradeUpdate,
  useGetAdminInvestmentProjects,
  useGetAdminProjectContainerTracking,
  useGetAdminProjectTradeUpdates,
  useGetInvestorMe,
  useUpdateAdminProjectContainerTracking,
  getGetAdminInvestmentProjectsQueryKey,
  getGetAdminProjectContainerTrackingQueryKey,
  getGetAdminProjectTradeUpdatesQueryKey,
  getGetInvestorMeQueryKey,
  getInvestorMe,
  type ContainerTrackingUpdate,
  type JourneyStage,
  type JourneyStageUpdate,
  type AdminInvestmentProjectSummary,
  type ProjectTradeUpdateInput,
} from '@workspace/api-client-react';
import { Route, Router, Switch, useLocation } from 'wouter';

const apiValue = import.meta.env.VITE_LARAVEL_API_BASE_URL as string | undefined;
let apiOrigin: string | null = null;
try {
  apiOrigin = apiValue?.trim() ? new URL(apiValue.trim()).origin : null;
} catch {
  apiOrigin = null;
}
setBaseUrl(apiOrigin);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
const STAGES = ['origin', 'port', 'vessel', 'destination', 'buyer', 'settlement'] as const;
type StageName = (typeof STAGES)[number];
const TRACKING_FIELDS = [
  ['container_number', 'Container number'],
  ['bill_of_lading_number', 'Bill of lading number'],
  ['vessel_name', 'Vessel name'],
  ['port_of_loading', 'Port of loading'],
  ['destination_port', 'Destination port'],
  ['etd', 'Estimated departure (ETD)'],
  ['eta', 'Estimated arrival (ETA)'],
  ['trade_status', 'Trade status'],
] as const;
type FieldName = (typeof TRACKING_FIELDS)[number][0] | 'latest_tracking_update';
type EditorValues = Record<FieldName, string>;
type StageValues = Record<StageName, { status: string; date: string; details: string }>;
const EMPTY_RECORD: EditorValues = {
  container_number: '', bill_of_lading_number: '', vessel_name: '', port_of_loading: '',
  destination_port: '', etd: '', eta: '', trade_status: '', latest_tracking_update: '',
};
const EMPTY_STAGES: StageValues = {
  origin: { status: '', date: '', details: '' }, port: { status: '', date: '', details: '' },
  vessel: { status: '', date: '', details: '' }, destination: { status: '', date: '', details: '' },
  buyer: { status: '', date: '', details: '' }, settlement: { status: '', date: '', details: '' },
};

function useCsrfRequest() {
  const headers = useRef<Record<string, string>>({});
  const getCsrf = async () => {
    if (!apiOrigin) throw new Error('Laravel API is not configured. Set VITE_LARAVEL_API_BASE_URL before signing in.');
    const response = await fetch(`${apiOrigin}/sanctum/csrf-cookie`, { credentials: 'include' });
    if (!response.ok) throw new Error(`Could not initialize the secure Laravel session (HTTP ${response.status}).`);
    const token = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=');
    if (!token) throw new Error('Laravel did not return an XSRF-TOKEN cookie. Check the API CORS and cookie-domain configuration.');
    headers.current['X-XSRF-TOKEN'] = decodeURIComponent(token);
  };
  return { request: { credentials: 'include' as const, headers: headers.current }, getCsrf };
}

function errorStatus(error: unknown): number | null {
  return typeof error === 'object' && error && 'status' in error ? Number((error as { status: unknown }).status) : null;
}
function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return error instanceof Error ? error.message : 'The request could not be completed.';
  const obj = error as { message?: unknown; data?: unknown };
  const data = obj.data as { message?: unknown; errors?: unknown } | null;
  if (data?.errors && typeof data.errors === 'object') {
    const entries = Object.values(data.errors as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : [value]);
    if (entries.length) return entries.map(String).join(' ');
  }
  return typeof data?.message === 'string' ? data.message : typeof obj.message === 'string' ? obj.message : 'The request could not be completed.';
}
function getRoles(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const roles = (user as { roles?: unknown }).roles;
  if (Array.isArray(roles)) return roles.map((role) => typeof role === 'string' ? role : role && typeof role === 'object' && 'name' in role ? String((role as { name: unknown }).name) : '');
  return [];
}
function formatServerDate(value?: string | null): string {
  if (!value) return 'Not yet published';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function Brand() {
  return <div className="brand" aria-label="OG Exports container administration">
    <div className="brand-mark" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 7.5h18v12H3zM6 4.5h12v3H6zM7 11h4M13 11h4M7 15h4M13 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <div>OG Exports<small>Container administration</small></div>
  </div>;
}
function LoadingPage({ label = 'Checking your session' }: { label?: string }) {
  return <div className="shell"><header className="topbar"><Brand/><span className="top-note">OG EXPORTS · PRIVATE WORKSPACE</span></header><main className="workspace"><div className="loading" aria-label={label}><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div></main></div>;
}

function SignInPage({ apiConfigured }: { apiConfigured: boolean }) {
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const csrf = useCsrfRequest();
  const { data: user, isLoading: checking, error: sessionError } = useGetInvestorMe({
    request: { credentials: 'include' },
    query: { enabled: apiConfigured, queryKey: getGetInvestorMeQueryKey() },
  });
  const login = useAdminSessionLogin({ request: csrf.request });
  const verify = useAdminSessionTwoFactorVerify({ request: csrf.request });
  const resend = useAdminSessionTwoFactorResend({ request: csrf.request });
  const logout = useAdminSessionLogout({ request: csrf.request });
  const [challenge, setChallenge] = useState<{ token: string; email: string } | null>(null);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (user && getRoles(user).includes('admin')) setLocation('/projects');
  }, [user, setLocation]);
  useEffect(() => {
    if (errorStatus(sessionError) === 401 || errorStatus(sessionError) === 403) {
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== '/api/me' });
    }
  }, [sessionError, client]);

  const completeLogin = async () => {
    await client.invalidateQueries({ queryKey: getGetInvestorMeQueryKey() });
    const session = await client.fetchQuery({
      queryKey: getGetInvestorMeQueryKey(),
      queryFn: () => getInvestorMe({ credentials: 'include' }),
    });
    if (!getRoles(session).includes('admin')) throw new Error('This account does not have OG Exports administrator access.');
    await client.invalidateQueries();
    setLocation('/projects');
  };
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLocalError(''); setNotice('');
    try {
      await csrf.getCsrf();
      const result = await login.mutateAsync({ data: { email, password, remember } });
      if (result.requires_2fa === true && typeof result.token === 'string') {
        setChallenge({ token: result.token, email: typeof result.email === 'string' ? result.email : email });
        setPassword('');
      } else {
        await completeLogin();
      }
    } catch (error) { setLocalError(errorMessage(error)); }
  };
  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLocalError(''); setNotice('');
    if (!challenge) return;
    try { await csrf.getCsrf(); await verify.mutateAsync({ data: { token: challenge.token, code, remember } }); setChallenge(null); await completeLogin(); }
    catch (error) { setLocalError(errorMessage(error)); }
  };
  const resendCode = async () => {
    if (!challenge) return;
    setLocalError(''); setNotice('');
    try { await csrf.getCsrf(); await resend.mutateAsync({ data: { token: challenge.token } }); setNotice('A fresh sign-in code has been sent to your email.'); }
    catch (error) { setLocalError(errorMessage(error)); }
  };
  const signOutNonAdmin = async () => {
    setLocalError('');
    try {
      await csrf.getCsrf();
      await logout.mutateAsync();
      await client.clear();
      setChallenge(null);
      setEmail('');
      setPassword('');
    } catch (error) {
      setLocalError(errorMessage(error));
    }
  };
  if (apiConfigured && checking) return <LoadingPage/>;
  if (user && !getRoles(user).includes('admin')) {
    return <div className="auth-page"><AuthAside/><main className="auth-main"><div className="auth-card"><span className="eyebrow">Access restricted</span><h1>Administrator access only.</h1><p>This signed-in account does not have the OG Exports admin role.</p>{localError && <div className="alert-strip" role="alert">{localError}</div>}<button className="button quiet" onClick={signOutNonAdmin} disabled={logout.isPending}>{logout.isPending ? 'Signing out…' : 'Sign out and return to sign in'}</button></div></main></div>;
  }
  return <div className="auth-page"><AuthAside/><main className="auth-main"><section className="auth-card">
    <span className="eyebrow">{challenge ? 'Secure verification · step 02' : 'Administrator access'}</span>
    <h1>{challenge ? 'Check your inbox.' : 'Welcome back.'}</h1>
    <p>{challenge ? `Enter the six-digit email code sent to ${challenge.email}.` : 'Sign in to publish shipment details reported by OG Exports.'}</p>
    {!apiConfigured && <div className="api-warning" role="alert">Laravel API is not configured. Set <code>VITE_LARAVEL_API_BASE_URL</code> to the Laravel API URL. No sign-in request has been sent.</div>}
    {apiConfigured && (localError || (sessionError && errorStatus(sessionError) !== 401 && errorStatus(sessionError) !== 403)) && <div className="alert-strip" role="alert">{localError || errorMessage(sessionError)}</div>}
    {notice && <div className="success-strip" role="status">{notice}</div>}
    {challenge ? <form className="auth-form" onSubmit={submitCode}>
      <div className="field"><label htmlFor="challenge-code">Email verification code</label><input id="challenge-code" data-testid="input-two-factor-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"/></div>
      <label className="remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> Keep me signed in</label>
      <button className="button primary" data-testid="button-verify-code" disabled={!apiConfigured || verify.isPending}>{verify.isPending ? 'Verifying…' : 'Verify and enter workspace'}</button>
      <div className="auth-small">Code not here? <button type="button" className="link-button" onClick={resendCode} disabled={resend.isPending}>{resend.isPending ? 'Sending…' : 'Send a new code'}</button><br/><button type="button" className="link-button" onClick={() => { setChallenge(null); setCode(''); setLocalError(''); }}>Back to sign in</button></div>
    </form> : <form className="auth-form" onSubmit={submitLogin}>
      <div className="field"><label htmlFor="email-address">Admin email</label><input id="email-address" data-testid="input-admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@ogexports.com"/></div>
      <div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" data-testid="input-admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password"/></div>
      <label className="remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> Keep me signed in</label>
      <button className="button primary" data-testid="button-admin-sign-in" disabled={!apiConfigured || login.isPending}>{login.isPending ? 'Signing in…' : 'Continue securely'}</button>
      <div className="auth-small">A verification code may be required after password authentication.</div>
    </form>}
  </section></main></div>;
}
function AuthAside() {
  return <aside className="auth-aside"><Brand/><div><div className="eyebrow">Shipment records · by OG Exports</div><h2 className="auth-title">Every handoff,<br/><em>as reported.</em></h2><p className="auth-copy">A focused workspace for maintaining the container details and trade stages your team has confirmed.</p></div><div className="auth-foot">No live carrier feed · Admin-reported details only</div></aside>;
}

function ProjectsPage({ user, onAuthLost }: { user: unknown; onAuthLost: () => void }) {
  const client = useQueryClient();
  const csrf = useCsrfRequest();
  const logout = useAdminSessionLogout({ request: csrf.request });
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const params = useMemo(() => ({ type: 'container', search: search.trim() || undefined, page, per_page: 12 }), [search, page]);
  const projects = useGetAdminInvestmentProjects(params, {
    request: { credentials: 'include' },
    query: { enabled: Boolean(apiOrigin && getRoles(user).includes('admin')), queryKey: getGetAdminInvestmentProjectsQueryKey(params) },
  });
  const rows = projects.data?.data ?? [];
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    if (rows.length && (!selected || !rows.some((row) => String(row.id) === selected))) setSelected(String(rows[0].id));
  }, [rows, selected]);
  useEffect(() => {
    if (errorStatus(projects.error) === 401 || errorStatus(projects.error) === 403) onAuthLost();
  }, [projects.error, onAuthLost]);
  const meta = projects.data?.meta as Record<string, unknown> | undefined;
  const currentPage = Number(meta?.current_page ?? page);
  const lastPage = Number(meta?.last_page ?? 1);
  const handleLogout = async () => {
    try { await csrf.getCsrf(); await logout.mutateAsync(); }
    catch (error) {
      if (errorStatus(error) !== 401 && errorStatus(error) !== 403) console.error('Logout request failed', error);
    } finally {
      await client.clear();
      setLocation('/');
    }
  };
  return <div className="shell">
    <header className="topbar"><Brand/><div className="top-actions"><span className="top-note">{user && typeof user === 'object' && 'email' in user ? String((user as {email: unknown}).email) : 'ADMIN WORKSPACE'}</span><button className="button quiet small" data-testid="button-admin-logout" onClick={handleLogout} disabled={logout.isPending}>{logout.isPending ? 'Signing out…' : 'Sign out'}</button></div></header>
    <div className="layout">
      <aside className="rail"><div className="rail-kicker">Workspace / 01</div><h2>Container<br/>projects</h2>
        <div className="search-wrap"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="project-search">Search container projects</label><input id="project-search" className="search" data-testid="input-project-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects"/></div>
        {projects.isLoading ? <div className="loading" aria-label="Loading projects"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div> :
          errorStatus(projects.error) === 401 || errorStatus(projects.error) === 403 ? <div className="alert-strip" role="alert">Your admin session is no longer available. Please sign in again.</div> :
          projects.error ? <div className="rail-empty" role="alert">{errorMessage(projects.error)}<br/><button className="link-button" onClick={() => void projects.refetch()}>Retry project list</button></div> :
          rows.length === 0 ? <div className="rail-empty">{search ? 'No container projects match this search.' : 'No container projects are available.'}</div> :
          <div className="project-list" aria-label="Container projects">{rows.map((project) => <ProjectRow key={project.id} project={project} selected={String(project.id) === selected} onSelect={() => setSelected(String(project.id))}/>)}</div>}
        {lastPage > 1 && <div className="rail-pager"><button className="pager-button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>←</button><span>PAGE {currentPage} / {lastPage}</span><button className="pager-button" aria-label="Next page" disabled={currentPage >= lastPage} onClick={() => setPage((value) => Math.min(lastPage, value + 1))}>→</button></div>}
      </aside>
      <main className="workspace">
        {projects.error && (errorStatus(projects.error) === 401 || errorStatus(projects.error) === 403) ? <div className="empty-state"><div className="empty-inner"><div className="empty-mark">!</div><h2>Admin access required</h2><p>Your Laravel session could not access the project list. Sign in again to continue.</p><button className="button primary" onClick={() => setLocation('/')}>Return to sign in</button></div></div> :
        !selected ? <div className="empty-state"><div className="empty-inner"><div className="empty-mark">01</div><h2>{projects.isLoading ? 'Loading the project register' : 'Select a container project'}</h2><p>Choose an existing OG Exports container project to review and publish its reported shipment details.</p></div></div> :
        <TrackingEditor key={selected} projectId={selected} project={rows.find((row) => String(row.id) === selected)} onAuthLost={onAuthLost}/>}
      </main>
    </div>
  </div>;
}

function ProjectRow({ project, selected, onSelect }: { project: AdminInvestmentProjectSummary; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`project-item${selected ? ' selected' : ''}`} data-testid={`button-project-${project.id}`} aria-pressed={selected} onClick={onSelect}>
    <div className="project-title">{project.title}</div><div className="project-meta"><span>{project.reference || `PROJECT ${project.id}`}</span><span className={`project-state${project.status?.toLowerCase() === 'active' ? ' live' : ''}`}>{project.status || project.type || 'Container'}</span></div>
  </button>;
}

function TrackingEditor({ projectId, project, onAuthLost }: { projectId: string; project?: AdminInvestmentProjectSummary; onAuthLost: () => void }) {
  const client = useQueryClient();
  const csrf = useCsrfRequest();
  const update = useUpdateAdminProjectContainerTracking({ request: csrf.request });
  const tracking = useGetAdminProjectContainerTracking(projectId, {
    request: { credentials: 'include' },
    query: { enabled: Boolean(apiOrigin), queryKey: getGetAdminProjectContainerTrackingQueryKey(projectId) },
  });
  const [values, setValues] = useState<EditorValues>(EMPTY_RECORD);
  const [stages, setStages] = useState<StageValues>(EMPTY_STAGES);
  const [baseline, setBaseline] = useState<EditorValues>(EMPTY_RECORD);
  const [stageBaseline, setStageBaseline] = useState<StageValues>(EMPTY_STAGES);
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initId = useRef<string | null>(null);
  const missing = errorStatus(tracking.error) === 404;
  const authLost = errorStatus(tracking.error) === 401 || errorStatus(tracking.error) === 403;
  const knownError = errorStatus(tracking.error);
  useEffect(() => { if (authLost) onAuthLost(); }, [authLost, onAuthLost]);
  useEffect(() => {
    if (tracking.isLoading || (tracking.error && !missing)) return;
    if (initId.current === projectId) return;
    const record = tracking.data;
    const next: EditorValues = { ...EMPTY_RECORD };
    TRACKING_FIELDS.forEach(([key]) => { next[key] = record?.[key] ?? ''; });
    next.latest_tracking_update = record?.latest_tracking_update ?? '';
    const nextStages: StageValues = { ...EMPTY_STAGES };
    STAGES.forEach((stage) => {
      const source = record?.container_journey?.[stage];
      nextStages[stage] = { status: source?.status ?? '', date: source?.date ?? '', details: source?.details ?? '' };
    });
    initId.current = projectId;
    setValues(next); setBaseline(next); setStages(nextStages); setStageBaseline(nextStages); setInitialized(true);
  }, [tracking.data, tracking.error, tracking.isLoading, missing, projectId]);
  const dirty = TRACKING_FIELDS.some(([key]) => values[key] !== baseline[key]) ||
    values.latest_tracking_update !== baseline.latest_tracking_update ||
    STAGES.some((stage) => (['status', 'date', 'details'] as const).some((field) => stages[stage][field] !== stageBaseline[stage][field]));
  const editField = (key: FieldName, value: string) => { setValues((current) => ({ ...current, [key]: value })); setSaved(false); };
  const editStage = (stage: StageName, field: keyof JourneyStage, value: string) => {
    setStages((current) => ({ ...current, [stage]: { ...current[stage], [field]: value } }));
    setSaved(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaveError(''); setSaved(false);
    const payload: ContainerTrackingUpdate = {};
    TRACKING_FIELDS.forEach(([key]) => {
      if (values[key] !== baseline[key]) payload[key] = values[key].trim() === '' ? null : values[key];
    });
    if (values.latest_tracking_update !== baseline.latest_tracking_update) payload.latest_tracking_update = values.latest_tracking_update.trim() === '' ? null : values.latest_tracking_update;
    const journey: NonNullable<ContainerTrackingUpdate['container_journey']> = {};
    STAGES.forEach((stage) => {
      const changed: JourneyStageUpdate = {};
      (['status', 'date', 'details'] as const).forEach((field) => {
        if (stages[stage][field] !== stageBaseline[stage][field]) changed[field] = stages[stage][field].trim() === '' ? null : stages[stage][field];
      });
      if (Object.keys(changed).length) journey[stage] = changed;
    });
    if (Object.keys(journey).length) payload.container_journey = journey;
    if (!Object.keys(payload).length) return;
    try {
      await csrf.getCsrf();
      const response = await update.mutateAsync({ id: projectId, data: payload });
      const next: EditorValues = { ...EMPTY_RECORD };
      TRACKING_FIELDS.forEach(([key]) => { next[key] = response[key] ?? ''; });
      next.latest_tracking_update = response.latest_tracking_update ?? '';
      const nextStages: StageValues = { ...EMPTY_STAGES };
      STAGES.forEach((stage) => {
        const item = response.container_journey?.[stage];
        nextStages[stage] = { status: item?.status ?? '', date: item?.date ?? '', details: item?.details ?? '' };
      });
      setValues(next); setBaseline(next); setStages(nextStages); setStageBaseline(nextStages);
      client.setQueryData(getGetAdminProjectContainerTrackingQueryKey(projectId), response);
      setSaved(true);
    } catch (error) {
      if (errorStatus(error) === 401 || errorStatus(error) === 403) onAuthLost();
      setSaveError(errorMessage(error));
    }
  };
  if (tracking.isLoading || !initialized) return <div className="loading" aria-label="Loading OG Exports-reported tracking record"><div className="skeleton" style={{height:100}}/><div className="skeleton" style={{height:220}}/><div className="skeleton" style={{height:250}}/></div>;
  if (authLost) return <div className="alert-strip" role="alert">{knownError === 401 ? 'Your admin session has expired (401).' : 'Your account is not authorized to view this record (403).'} Return to sign in to restore access.</div>;
  if (tracking.error && !missing) return <div className="empty-state"><div className="empty-inner"><div className="empty-mark">!</div><h2>Tracking record unavailable</h2><p>{errorMessage(tracking.error)}</p><button className="button" onClick={() => void tracking.refetch()}>Retry record</button></div></div>;
  const fieldLabel = (key: FieldName) => key === 'latest_tracking_update' ? 'Latest tracking update' : TRACKING_FIELDS.find(([field]) => field === key)?.[1] ?? key;
  const fieldInput = (key: FieldName, wide = false) => <div className={`field${wide ? ' wide' : ''}`} key={key}><label htmlFor={`tracking-${key}`}>{fieldLabel(key)}{key === 'latest_tracking_update' ? ' · OG Exports note' : ''}</label>{key === 'latest_tracking_update' ?
    <textarea id={`tracking-${key}`} data-testid={`input-tracking-${key}`} maxLength={1000} value={values[key]} onChange={(event) => editField(key, event.target.value)} placeholder="Write an update explicitly confirmed by OG Exports"/> :
    <input id={`tracking-${key}`} data-testid={`input-tracking-${key}`} maxLength={key === 'etd' || key === 'eta' ? 64 : key === 'container_number' ? 80 : key === 'bill_of_lading_number' ? 120 : key === 'trade_status' ? 80 : 160} value={values[key]} onChange={(event) => editField(key, event.target.value)} placeholder="Not reported"/>}</div>;
  return <div>
    <div className="workspace-head"><div><div className="eyebrow">Container record / OG Exports report</div><h1>{project?.title ?? `Project ${projectId}`}</h1><div className="project-reference">{project?.reference || `PROJECT ${projectId}`} {project?.commodity ? `· ${project.commodity}` : ''} {project?.origin || project?.destination ? `· ${project.origin || '—'} → ${project.destination || '—'}` : ''}</div></div><span className="report-badge"><i aria-hidden="true"/>OG EXPORTS-REPORTED</span></div>
    <div className="notice"><span aria-hidden="true">i</span><div><strong>Reported information only.</strong> Live carrier tracking is not connected. No location or progress is calculated. The latest update below is admin-authored text, not a carrier event.</div></div>
    {missing && <div className="alert-strip" role="status"><strong>No tracking record has been published for this project yet.</strong> Enter confirmed OG Exports details below; the first save will create its record.</div>}
    {saved && <div className="success-strip" data-testid="status-save-success" role="status"><strong>OG Exports update published.</strong> The values below reflect the server response. Server timestamp: {formatServerDate(tracking.data?.tracking_updated_at)}.</div>}
    {saveError && <div className="alert-strip" role="alert" data-testid="status-save-error"><strong>Save failed.</strong> {saveError}</div>}
    <form onSubmit={submit}>
      <section className="record-panel"><div className="panel-heading"><div><h2>Shipment identifiers</h2><div className="panel-caption">Values must be explicitly supplied by OG Exports.</div></div><span className="timestamp">{tracking.data?.tracking_updated_at ? <>SERVER UPDATE · <strong>{formatServerDate(tracking.data.tracking_updated_at)}</strong></> : 'NOT YET PUBLISHED'}</span></div>
        <div className="panel-content"><div className="grid-fields">{TRACKING_FIELDS.map(([key]) => fieldInput(key))}{fieldInput('latest_tracking_update', true)}</div></div>
      </section>
      <section className="record-panel"><div className="panel-heading"><div><h2>Container journey</h2><div className="panel-caption">Six independent stages. Stage order does not represent progress.</div></div><span className="report-badge"><i aria-hidden="true"/>OG EXPORTS-REPORTED</span></div>
        <div className="panel-content"><div className="journey-grid">{STAGES.map((stage) => <div className="stage" key={stage}>
          <div className="stage-head"><span className="stage-name">{stage}</span><span className="stage-label">REPORTED DETAIL</span></div>
          <div className="field"><label htmlFor={`stage-${stage}-status`}>Status</label><input id={`stage-${stage}-status`} data-testid={`input-stage-${stage}-status`} maxLength={80} value={stages[stage].status} onChange={(event) => editStage(stage, 'status', event.target.value)} placeholder="Not reported"/></div>
          <div className="field"><label htmlFor={`stage-${stage}-date`}>Date</label><input id={`stage-${stage}-date`} data-testid={`input-stage-${stage}-date`} maxLength={64} value={stages[stage].date} onChange={(event) => editStage(stage, 'date', event.target.value)} placeholder="Not reported"/></div>
          <div className="field"><label htmlFor={`stage-${stage}-details`}>Details</label><textarea id={`stage-${stage}-details`} data-testid={`input-stage-${stage}-details`} maxLength={1000} value={stages[stage].details} onChange={(event) => editStage(stage, 'details', event.target.value)} placeholder="Not reported"/></div>
        </div>)}</div>
        <div className="action-row"><span className="save-status">{dirty ? 'Unsaved changes · only edited fields will be sent.' : saved ? 'All changes are published.' : 'No unsaved changes.'}</span><button className="button primary" data-testid="button-save-tracking" type="submit" disabled={!dirty || update.isPending}>{update.isPending ? 'Publishing…' : missing ? 'Create reported record' : 'Publish OG Exports update'}</button></div>
        </div>
      </section>
    </form>
    <TradeUpdatesPanel projectId={projectId} onAuthLost={onAuthLost} />
  </div>;
}

function TradeUpdatesPanel({ projectId, onAuthLost }: { projectId: string; onAuthLost: () => void }) {
  const client = useQueryClient();
  const csrf = useCsrfRequest();
  const updates = useGetAdminProjectTradeUpdates(projectId, {
    request: { credentials: 'include' },
    query: { enabled: Boolean(apiOrigin), queryKey: getGetAdminProjectTradeUpdatesQueryKey(projectId) },
  });
  const create = useCreateAdminProjectTradeUpdate({ request: csrf.request });
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [savedAt, setSavedAt] = useState('');
  const [saveError, setSaveError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorStatus(updates.error) === 401 || errorStatus(updates.error) === 403) onAuthLost();
  }, [updates.error, onAuthLost]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt('');
    setSaveError('');

    const date = new Date(occurredAt);
    if (Number.isNaN(date.getTime())) {
      setSaveError('Enter a valid date and time for this reported event.');
      return;
    }
    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setSaveError('The supporting file must be 10 MB or smaller.');
      return;
    }

    const data: ProjectTradeUpdateInput = {
      status: status.trim(),
      description: description.trim(),
      occurred_at: date.toISOString(),
    };
    if (attachment) data.attachment = attachment;

    try {
      await csrf.getCsrf();
      const response = await create.mutateAsync({ id: projectId, data });
      await client.invalidateQueries({ queryKey: getGetAdminProjectTradeUpdatesQueryKey(projectId) });
      await updates.refetch();
      setStatus('');
      setDescription('');
      setOccurredAt('');
      setAttachment(null);
      if (fileInput.current) fileInput.current.value = '';
      setSavedAt(response.data.occurred_at);
    } catch (error) {
      if (errorStatus(error) === 401 || errorStatus(error) === 403) onAuthLost();
      setSaveError(errorMessage(error));
    }
  };

  const entries = updates.data?.data ?? [];
  return <section className="record-panel">
    <div className="panel-heading">
      <div><h2>Trade update feed</h2><div className="panel-caption">Append event details confirmed by OG Exports. Each update keeps its own event time.</div></div>
      <span className="report-badge"><i aria-hidden="true"/>OG EXPORTS-REPORTED</span>
    </div>
    <div className="panel-content">
      {savedAt && <div className="success-strip" role="status"><strong>Trade update published.</strong> Server response event time: {formatServerDate(savedAt)}.</div>}
      {saveError && <div className="alert-strip" role="alert"><strong>Could not publish update.</strong> {saveError}</div>}
      <form onSubmit={submit}>
        <div className="grid-fields update-fields">
          <div className="field">
            <label htmlFor="trade-update-status">Status</label>
            <input id="trade-update-status" data-testid="input-trade-update-status" required maxLength={120} value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Enter the reported status"/>
          </div>
          <div className="field">
            <label htmlFor="trade-update-time">Event date and time · as confirmed by OG Exports</label>
            <input id="trade-update-time" data-testid="input-trade-update-time" type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)}/>
          </div>
          <div className="field wide">
            <label htmlFor="trade-update-description">Description</label>
            <textarea id="trade-update-description" data-testid="input-trade-update-description" required maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what OG Exports has confirmed"/>
          </div>
          <div className="field wide">
            <label htmlFor="trade-update-attachment">Supporting document or image · optional</label>
            <input ref={fileInput} id="trade-update-attachment" data-testid="input-trade-update-attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setAttachment(event.currentTarget.files?.[0] ?? null)}/>
          </div>
        </div>
        <div className="action-row">
          <span className="save-status">Updates are added to the feed and are not overwritten by later events.</span>
          <button className="button primary" data-testid="button-publish-trade-update" type="submit" disabled={!apiOrigin || create.isPending}>{create.isPending ? 'Publishing…' : 'Publish trade update'}</button>
        </div>
      </form>

      <div className="update-history">
        <div className="update-history-head">
          <h3>Published updates</h3>
          {updates.isFetching ? <span className="timestamp">Refreshing…</span> : null}
        </div>
        {updates.isLoading ? <div className="loading" aria-label="Loading trade updates"><div className="skeleton"/></div> :
          updates.error ? <div className="alert-strip" role="alert">{errorMessage(updates.error)} <button className="link-button" onClick={() => void updates.refetch()}>Retry</button></div> :
          entries.length === 0 ? <div className="rail-empty">No trade updates have been published for this project.</div> :
          <div className="update-list">{entries.map((entry) => <article key={entry.id}>
            <div className="update-list-heading"><strong>{entry.status}</strong><time>{formatServerDate(entry.occurred_at)}</time></div>
            <p>{entry.description}</p>
            {entry.attachment_name ? <div className="update-attachment">Supporting file · {entry.attachment_name}</div> : null}
          </article>)}</div>}
      </div>
    </div>
  </section>;
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return <main className="not-found"><div><div className="eyebrow">OG Exports / 404</div><h1>Route not found.</h1><p>This workspace path does not exist.</p><button className="button primary" onClick={() => setLocation('/')}>Return to sign in</button></div></main>;
}

function AppRoutes() {
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const session = useGetInvestorMe({
    request: { credentials: 'include' },
    query: { enabled: Boolean(apiOrigin), queryKey: getGetInvestorMeQueryKey() },
  });
  const onAuthLost = useCallback(() => {
    void client.clear();
    setLocation('/');
  }, [client, setLocation]);
  const isAdmin = Boolean(session.data && getRoles(session.data).includes('admin'));
  const sessionDenied = errorStatus(session.error) === 401 || errorStatus(session.error) === 403;
  useEffect(() => {
    if (sessionDenied) client.removeQueries({ predicate: (query) => query.queryKey[0] !== '/api/me' });
  }, [sessionDenied, client]);
  return <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Switch>
    <Route path="/" component={() => <SignInPage apiConfigured={Boolean(apiOrigin)}/>}/>
    <Route path="/projects" component={() => !apiOrigin ? <SignInPage apiConfigured={false}/> : session.isLoading ? <LoadingPage/> : isAdmin ? <ProjectsPage user={session.data} onAuthLost={onAuthLost}/> : <SignInPage apiConfigured/>}/>
    <Route component={NotFoundPage}/>
  </Switch></Router>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AppRoutes/></QueryClientProvider>;
}
export default App;