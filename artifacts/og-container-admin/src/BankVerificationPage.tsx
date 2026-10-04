import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdminInvestorBankAccounts, getGetAdminInvestorBankAccountsQueryKey, useApproveAdminInvestorBankAccount, useRejectAdminInvestorBankAccount } from '@workspace/api-client-react';

type RequestConfig = { credentials: 'include'; headers: Record<string, string> };
type ReviewStatus = 'pending' | 'verified' | 'rejected' | 'all';
type Props = {
  apiOrigin: string;
  user: unknown;
  request: RequestConfig;
  getCsrf: () => Promise<void>;
  onBack: () => void;
  onAuthLost: () => void;
};

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function errorStatus(error: unknown): number | null {
  return typeof error === 'object' && error && 'status' in error
    ? Number((error as { status: unknown }).status)
    : null;
}

function errorMessage(error: unknown): string {
  const record = object(error);
  const data = object(record.data);
  return text(data.message, text(record.message, 'The bank review request could not be completed.'));
}

export default function BankVerificationPage({ apiOrigin, user, request, getCsrf, onBack, onAuthLost }: Props) {
  const client = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const params = useMemo(() => ({
    status,
    search: search.trim() || undefined,
    page,
    per_page: 20,
  }), [status, search, page]);
  const query = useGetAdminInvestorBankAccounts(params, {
    request: { credentials: 'include' },
    query: { enabled: Boolean(apiOrigin), queryKey: getGetAdminInvestorBankAccountsQueryKey(params) },
  });
  const approve = useApproveAdminInvestorBankAccount({ request });
  const reject = useRejectAdminInvestorBankAccount({ request });
  const payload = object(query.data);
  const rows = Array.isArray(payload.data) ? payload.data.map(object) : [];
  const lastPage = Number(payload.last_page ?? 1);
  const busy = approve.isPending || reject.isPending;

  useEffect(() => {
    if (errorStatus(query.error) === 401 || errorStatus(query.error) === 403) onAuthLost();
  }, [query.error, onAuthLost]);
  useEffect(() => { setPage(1); }, [status, search]);

  async function review(id: string, decision: 'approve' | 'reject') {
    const note = (notes[id] ?? '').trim();
    if (decision === 'reject' && note.length < 3) {
      setError('Add a short reason before rejecting this submission.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await getCsrf();
      const body = { notes: note || null };
      if (decision === 'approve') await approve.mutateAsync({ verification: Number(id), data: body });
      else await reject.mutateAsync({ verification: Number(id), data: body });
      await client.invalidateQueries({ queryKey: getGetAdminInvestorBankAccountsQueryKey(params) });
      setSuccess(decision === 'approve' ? 'Account marked verified.' : 'Proof rejected with review notes.');
      setNotes(current => ({ ...current, [id]: '' }));
    } catch (cause) {
      setError(errorMessage(cause));
      if (errorStatus(cause) === 401 || errorStatus(cause) === 403) onAuthLost();
    }
  }

  const userEmail = text(object(user).email, 'ADMIN WORKSPACE');

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">OG</span><span>OG EXPORTS</span></div>
      <div className="top-actions"><span className="top-note">{userEmail}</span><button className="button quiet small" onClick={onBack}>Container projects</button></div>
    </header>
    <main className="workspace" style={{ maxWidth: 1300, margin: '0 auto', width: '100%' }}>
      <div className="workspace-head">
        <div><div className="eyebrow">COMPLIANCE / PAYOUTS</div><h1>Bank account review</h1>
          <p className="panel-caption">Review private proof before changing a bank account’s status. Full account identifiers remain masked in this queue.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Submissions</h2><div className="panel-caption">Approval is blocked if the saved bank details changed after proof was uploaded.</div></div>
          <select className="search" aria-label="Filter bank review status" value={status} onChange={event => setStatus(event.target.value as ReviewStatus)}>
            <option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="all">All</option>
          </select>
        </div>
        <div className="panel-content">
          <div className="search-wrap" style={{ marginBottom: 18 }}>
            <label className="sr-only" htmlFor="bank-review-search">Search investor</label>
            <input id="bank-review-search" className="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search investor name or email"/>
          </div>
          {error ? <div className="alert-strip" role="alert">{error}</div> : null}
          {success ? <div className="success-strip" role="status">{success}</div> : null}
          {query.isLoading ? <div className="loading" aria-label="Loading bank submissions"><div className="skeleton"/></div> : null}
          {query.error && errorStatus(query.error) !== 401 && errorStatus(query.error) !== 403
            ? <div className="alert-strip" role="alert">{errorMessage(query.error)} <button className="link-button" onClick={() => void query.refetch()}>Retry</button></div>
            : null}
          {!query.isLoading && !query.error && rows.length === 0
            ? <div className="rail-empty">No bank proof submissions match this filter.</div>
            : null}
          <div style={{ display: 'grid', gap: 14 }}>
            {rows.map(row => {
              const id = text(row.verification_id);
              const investor = object(row.investor);
              const account = object(row.bank_account);
              const current = row.account_matches === true;
              const rowStatus = text(row.status, 'unavailable');
              return <article key={id} style={{ border: '1px solid #e6e0d6', borderRadius: 9, padding: 18, background: '#fffdf8' }}>
                <div className="panel-heading" style={{ padding: 0, border: 0, marginBottom: 12 }}>
                  <div><h2>{text(investor.name, 'Investor')}</h2><div className="panel-caption">{text(investor.email)}</div></div>
                  <span className={`project-state${rowStatus === 'verified' ? ' live' : ''}`}>{rowStatus.toUpperCase()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, fontSize: 12 }}>
                  <div><strong>Bank</strong><div>{text(account.bank_name, 'Not provided')}</div></div>
                  <div><strong>Account holder</strong><div>{text(account.account_holder, 'Not provided')}</div></div>
                  <div><strong>Account identifier</strong><div>{text(account.masked_account_identifier, 'Unavailable')}</div></div>
                  <div><strong>Currency</strong><div>{text(account.currency, 'Not provided')}</div></div>
                  <div><strong>Proof</strong><div>{text(row.proof_name, 'Document name unavailable')}</div></div>
                  <div><strong>Submitted</strong><div>{text(row.submitted_at, 'Date unavailable')}</div></div>
                </div>
                {!current ? <div className="alert-strip" style={{ marginTop: 14, marginBottom: 0 }}>Bank details changed after this proof was submitted. Do not approve; ask for current proof.</div> : null}
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor={`review-note-${id}`}>Review note{rowStatus === 'pending' ? ' · required to reject' : ''}</label>
                  <textarea id={`review-note-${id}`} className="search" rows={3} maxLength={2000} value={notes[id] ?? ''} onChange={event => setNotes(value => ({ ...value, [id]: event.target.value }))} placeholder="Explain any issue the investor should correct"/>
                </div>
                <div className="action-row" style={{ justifyContent: 'flex-start' }}>
                  <button className="button quiet" onClick={() => window.open(`${apiOrigin.replace(/\/+$/, '')}/api/admin/compliance/bank-accounts/${encodeURIComponent(id)}/proof`, '_blank', 'noopener,noreferrer')}>Open proof</button>
                  {rowStatus === 'pending' ? <>
                    <button className="button primary" disabled={busy || !current} onClick={() => void review(id, 'approve')}>{approve.isPending ? 'Saving…' : 'Mark verified'}</button>
                    <button className="button" disabled={busy} onClick={() => void review(id, 'reject')}>{reject.isPending ? 'Saving…' : 'Reject proof'}</button>
                  </> : null}
                </div>
              </article>;
            })}
          </div>
          {lastPage > 1 ? <div className="rail-pager" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="pager-button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>←</button>
            <span>PAGE {page} / {lastPage}</span>
            <button className="pager-button" disabled={page >= lastPage} onClick={() => setPage(value => Math.min(lastPage, value + 1))}>→</button>
          </div> : null}
        </div>
      </section>
    </main>
  </div>;
}