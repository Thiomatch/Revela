import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  activateWorkAgreement,
  DEFAULT_AGREEMENT_VERSION,
  downloadAgreementPdf,
  getActiveAgreementVersion,
  getAllWorkAgreements,
  getMyWorkAgreements,
  generateWorkAgreementPdf,
  printAgreementPdfInBrowser,
  reviewWorkAgreement,
  submitWorkAgreement,
  terminateWorkAgreement,
  type AgreementStatus,
  type AgreementVersion,
  type BrowserAgreementDocument,
  type WorkWithUsAgreement,
} from './workWithUsStore';
import { supabase } from './supabaseClient';
import './WorkWithUs.css';

type WorkWithUsProps = {
  onClose: () => void;
  initialView?: AgreementView;
};

type LocalProfile = {
  Name?: string;
  Email?: string;
};

type AgreementView = 'apply' | 'mine' | 'admin';
type AuthMode = 'sign-in' | 'sign-up';

const agreementStatuses: AgreementStatus[] = [
  'submitted',
  'pending_review',
  'accepted_by_revela',
  'active',
  'rejected',
  'terminated',
];

function getLocalProfile(): LocalProfile {
  try {
    const storedProfile = localStorage.getItem('revela_registered_user');
    if (!storedProfile) return {};
    const profile: unknown = JSON.parse(storedProfile);
    if (typeof profile !== 'object' || profile === null) return {};
    const storedValues = profile as Record<string, unknown>;
    return {
      Name: typeof storedValues.Name === 'string' ? storedValues.Name : undefined,
      Email: typeof storedValues.Email === 'string' ? storedValues.Email : undefined,
    };
  } catch {
    return {};
  }
}

function statusLabel(status: AgreementStatus): string {
  return {
    submitted: 'Submitted',
    pending_review: 'Pending review',
    accepted_by_revela: 'Accepted by REVELA',
    active: 'Active',
    rejected: 'Rejected',
    terminated: 'Terminated',
  }[status];
}

function formatDate(value: string | null): string {
  if (!value) return 'Not set';
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString();
}

function replaceAgreement(
  agreements: WorkWithUsAgreement[],
  updated: WorkWithUsAgreement,
): WorkWithUsAgreement[] {
  return agreements.map((agreement) => agreement.id === updated.id ? updated : agreement);
}

export default function WorkWithUs({ onClose, initialView = 'apply' }: WorkWithUsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState(getLocalProfile().Email ?? '');
  const [authPassword, setAuthPassword] = useState('');
  const [agreementView, setAgreementView] = useState<AgreementView>(initialView);
  const [version, setVersion] = useState<AgreementVersion | null>(null);
  const [agreements, setAgreements] = useState<WorkWithUsAgreement[]>([]);
  const [localSignedAgreement, setLocalSignedAgreement] = useState<BrowserAgreementDocument | null>(null);
  const [adminAgreements, setAdminAgreements] = useState<WorkWithUsAgreement[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [requestedCommencementDate, setRequestedCommencementDate] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [acceptanceChecked, setAcceptanceChecked] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isSubmittingAgreement, setIsSubmittingAgreement] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [busyAgreementId, setBusyAgreementId] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [administratorName, setAdministratorName] = useState('');
  const [administratorSignature, setAdministratorSignature] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [commencementDate, setCommencementDate] = useState('');

  const isAdministrator = user?.app_metadata?.revela_agreement_admin === true;
  const email = user?.email ?? '';
  const existingOpenApplication = agreements.find(
    (agreement) => agreement.status !== 'rejected' && agreement.status !== 'terminated',
  );

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setErrorMessage('');
        setMessage('');
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setUser(data.session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setVersion(null);
      setAgreements([]);
      setLocalSignedAgreement(null);
      setVersionLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setAgreementLoading(true);
    const versionRequest = agreementView === 'apply'
      ? getActiveAgreementVersion()
      : Promise.resolve(null);
    if (agreementView === 'apply') {
      setVersion(DEFAULT_AGREEMENT_VERSION);
      setVersionLoading(true);
    }
    void Promise.allSettled([versionRequest, getMyWorkAgreements()])
      .then(([versionResult, applicantResult]) => {
        if (isCancelled) return;
        const localProfile = getLocalProfile();
        const metadata = user.user_metadata ?? {};
        if (versionResult.status === 'fulfilled' && versionResult.value) {
          setVersion(versionResult.value);
        } else if (agreementView === 'apply') {
          const reason = versionResult.status === 'rejected' && versionResult.reason instanceof Error
            ? versionResult.reason.message
            : 'The online agreement is unavailable.';
          setVersion({ ...DEFAULT_AGREEMENT_VERSION, fallbackReason: reason });
        }
        if (applicantResult.status === 'fulfilled') {
          setAgreements(applicantResult.value);
        } else {
          const reason = applicantResult.reason instanceof Error
            ? applicantResult.reason.message
            : 'Unknown error';
          setAgreements([]);
          setErrorMessage(`Your saved agreements could not be loaded: ${reason}`);
        }
        setFullName((current) => current || String(metadata.full_name ?? metadata.name ?? localProfile.Name ?? ''));
        setUsername((current) => current || String(metadata.username ?? ''));
        setPhone((current) => current || String(metadata.phone ?? ''));
        setAdministratorName((current) => current || String(metadata.full_name ?? metadata.name ?? user.email ?? ''));
      })
      .finally(() => {
        if (!isCancelled) {
          setAgreementLoading(false);
          if (agreementView === 'apply') setVersionLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [agreementView, user]);

  useEffect(() => {
    if (!user || !isAdministrator || agreementView !== 'admin') return undefined;

    let isCancelled = false;
    setAdminLoading(true);
    setErrorMessage('');
    void getAllWorkAgreements()
      .then((items) => {
        if (!isCancelled) setAdminAgreements(items);
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Administrative agreements could not be loaded.');
        }
      })
      .finally(() => {
        if (!isCancelled) setAdminLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [agreementView, isAdministrator, user]);

  const filteredAdminAgreements = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return adminAgreements.filter((agreement) => {
      const matchesSearch = !search || [
        agreement.full_name,
        agreement.email,
        agreement.phone,
        agreement.username ?? '',
      ].some((value) => value.toLowerCase().includes(search));
      const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
      const submittedDate = agreement.submitted_at.slice(0, 10);
      const matchesDateFrom = !dateFrom || submittedDate >= dateFrom;
      const matchesDateTo = !dateTo || submittedDate <= dateTo;
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [adminAgreements, dateFrom, dateTo, searchText, statusFilter]);

  const submitAuthentication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setMessage('');
    setIsAuthSubmitting(true);
    try {
      if (authMode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { full_name: authFullName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your REVELA account, then sign in to continue.');
        } else {
          setUser(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setUser(data.user);
      }
      setAuthPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication could not be completed.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');
    const { error } = await supabase.auth.signOut();
    if (error) setErrorMessage(error.message);
  };

  const reviewApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (!acceptanceChecked) {
      setErrorMessage('Please confirm that you have read and accepted the agreement.');
      return;
    }
    if (signatureText.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      setErrorMessage('Type your full legal name in the electronic signature field.');
      return;
    }
    if (versionLoading) {
      setErrorMessage('Wait for the current agreement version to finish loading before signing.');
      return;
    }
    setLocalSignedAgreement(null);
    setIsConfirming(true);
  };

  const createApplicantPdf = async (agreement: WorkWithUsAgreement) => {
    if (!user) throw new Error('Sign in before generating an agreement PDF.');
    const updatedAgreement = await generateWorkAgreementPdf(agreement.id);
    setAgreements((current) => current.some((item) => item.id === agreement.id)
      ? replaceAgreement(current, updatedAgreement)
      : [updatedAgreement, ...current]);
    return updatedAgreement;
  };

  const confirmSubmission = async () => {
    setErrorMessage('');
    setMessage('');
    setIsSubmittingAgreement(true);
    const localDocument: BrowserAgreementDocument = {
      full_name: fullName,
      username: username || null,
      email,
      phone,
      residential_address: residentialAddress || null,
      application_date: today,
      requested_commencement_date: requestedCommencementDate || null,
      commencement_date: null,
      agreement_version: version?.agreement_version ?? DEFAULT_AGREEMENT_VERSION.agreement_version,
      agreement_snapshot: version?.agreement_text ?? DEFAULT_AGREEMENT_VERSION.agreement_text,
      signature_text: signatureText,
      accepted_at: new Date().toISOString(),
      status: 'signed locally - not submitted',
    };
    try {
      const agreement = await submitWorkAgreement({
        agreementVersion: version?.agreement_version ?? '',
        fullName,
        username,
        phone,
        residentialAddress,
        requestedCommencementDate,
        signatureText,
        acceptanceChecked,
      });
      setLocalSignedAgreement(null);
      setAgreements((current) => [agreement, ...current]);
      setIsConfirming(false);
      setAgreementView('mine');
      try {
        await createApplicantPdf(agreement);
        setMessage('Your signed agreement was submitted successfully. Download it from My Agreements.');
      } catch (error) {
        setErrorMessage(`Your agreement was submitted, but the server PDF is unavailable: ${error instanceof Error ? error.message : 'Unknown error'}. You can create a browser PDF from My Agreements.`);
      }
    } catch (error) {
      setLocalSignedAgreement(localDocument);
      setIsConfirming(false);
      setErrorMessage(`Your agreement could not be submitted or recorded: ${error instanceof Error ? error.message : 'Unknown error'}. You can still print a browser copy, but it will not be submitted to REVELA.`);
    } finally {
      setIsSubmittingAgreement(false);
    }
  };

  const handleBrowserPdf = (agreement: BrowserAgreementDocument) => {
    setErrorMessage('');
    setMessage('');
    try {
      printAgreementPdfInBrowser(agreement);
      setMessage('The browser print dialog is open. Choose “Save as PDF” to download the signed agreement.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The browser PDF could not be opened.');
    }
  };

  const saveReviewedAgreement = async (
    agreement: WorkWithUsAgreement,
    decision: 'pending_review' | 'accepted' | 'rejected',
  ) => {
    if (decision !== 'pending_review' && !administratorName.trim()) {
      setErrorMessage('Enter the reviewing administrator’s name.');
      return;
    }
    if (decision === 'accepted' && !administratorSignature.trim()) {
      setErrorMessage('Enter the administrator’s electronic signature to accept.');
      return;
    }
    if (decision === 'accepted' && administratorSignature.trim().toLowerCase() !== administratorName.trim().toLowerCase()) {
      setErrorMessage('Type the administrator’s name in the electronic signature field.');
      return;
    }
    if (!window.confirm(`Confirm ${decision === 'accepted' ? 'accepting' : decision === 'rejected' ? 'rejecting' : 'marking for review'} this agreement?`)) {
      return;
    }

    setBusyAgreementId(agreement.id);
    setErrorMessage('');
    setMessage('');
    try {
      const updated = await reviewWorkAgreement({
        agreementId: agreement.id,
        decision,
        administratorName,
        administratorSignatureText: administratorSignature,
        rejectionReason,
      });
      setAdminAgreements((current) => replaceAgreement(current, updated));
      if (decision === 'accepted') {
        try {
          await regenerateFinalPdf(updated);
          setMessage(`Agreement for ${updated.full_name} accepted and final PDF generated.`);
        } catch (error) {
          setErrorMessage(
            `Agreement accepted, but the final PDF could not be generated: ${error instanceof Error ? error.message : 'Unknown error'}. Use Regenerate final PDF to retry.`,
          );
        }
      } else {
        setMessage(`Agreement for ${updated.full_name} updated: ${statusLabel(updated.status)}.`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The agreement review could not be saved.');
    } finally {
      setBusyAgreementId('');
    }
  };

  const regenerateFinalPdf = async (agreement: WorkWithUsAgreement) => {
    if (!agreement.administrator_name || !agreement.administrator_signature_text || !agreement.administrator_signed_at) {
      throw new Error('The REVELA signature details are not complete.');
    }
    setBusyAgreementId(agreement.id);
    try {
      const updatedAgreement = await generateWorkAgreementPdf(agreement.id, true);
      setAdminAgreements((current) => replaceAgreement(current, updatedAgreement));
      setAgreements((current) => current.map((item) => item.id === agreement.id ? updatedAgreement : item));
    } finally {
      setBusyAgreementId('');
    }
  };

  const activateAgreement = async (agreement: WorkWithUsAgreement) => {
    if (!commencementDate) {
      setErrorMessage('Set an agreed commencement date before activating this agreement.');
      return;
    }
    if (!window.confirm(`Activate the agreement for ${agreement.full_name} from ${commencementDate}?`)) return;
    setBusyAgreementId(agreement.id);
    setErrorMessage('');
    try {
      const updated = await activateWorkAgreement(agreement.id, commencementDate);
      setAdminAgreements((current) => replaceAgreement(current, updated));
      setMessage(`Agreement for ${updated.full_name} is now active.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The agreement could not be activated.');
    } finally {
      setBusyAgreementId('');
    }
  };

  const terminateAgreement = async (agreement: WorkWithUsAgreement) => {
    const reason = window.prompt('Optional termination reason:') ?? '';
    if (!window.confirm(`Terminate the active agreement for ${agreement.full_name}?`)) return;
    setBusyAgreementId(agreement.id);
    setErrorMessage('');
    try {
      const updated = await terminateWorkAgreement(agreement.id, reason);
      setAdminAgreements((current) => replaceAgreement(current, updated));
      setMessage(`Agreement for ${updated.full_name} has been terminated.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The agreement could not be terminated.');
    } finally {
      setBusyAgreementId('');
    }
  };

  const handleDownload = async (agreement: WorkWithUsAgreement, final = false) => {
    const path = final
      ? agreement.final_pdf_storage_path
      : agreement.final_pdf_storage_path || agreement.pdf_storage_path;
    if (!path) {
      setErrorMessage('The agreement PDF is not ready yet.');
      return;
    }
    setErrorMessage('');
    try {
      await downloadAgreementPdf(path, `REVELA-Agreement-${agreement.id}.pdf`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The agreement could not be downloaded.');
    }
  };

  const refreshAdminAgreements = async () => {
    setAdminLoading(true);
    setErrorMessage('');
    try {
      setAdminAgreements(await getAllWorkAgreements());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Administrative agreements could not be refreshed.');
    } finally {
      setAdminLoading(false);
    }
  };

  const refreshMyAgreements = async () => {
    setAgreementLoading(true);
    setErrorMessage('');
    try {
      setAgreements(await getMyWorkAgreements());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your agreements could not be refreshed.');
    } finally {
      setAgreementLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const displayedVersion = version ?? DEFAULT_AGREEMENT_VERSION;

  return (
    <main className="wwu-shell">
      <header className="wwu-header">
        <div>
          <span className="wwu-brand"><span>R</span> REVELA</span>
          <p>Work With Us</p>
        </div>
        <div className="wwu-header-actions">
          {user && <span className="wwu-signed-in">{email}</span>}
          {user && (
            <button type="button" className="wwu-button wwu-button-secondary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          )}
          <button type="button" className="wwu-close" onClick={onClose} aria-label="Close Work With Us">×</button>
        </div>
      </header>

      {user && (
        <nav className="wwu-tabs" aria-label="Work With Us sections">
          <button type="button" className={agreementView === 'apply' ? 'is-selected' : ''} onClick={() => { setErrorMessage(''); setMessage(''); setAgreementView('apply'); setIsConfirming(false); }}>
            Apply
          </button>
          <button type="button" className={agreementView === 'mine' ? 'is-selected' : ''} onClick={() => { setErrorMessage(''); setMessage(''); setAgreementView('mine'); }}>
            My Agreements
          </button>
          {isAdministrator && (
            <button type="button" className={agreementView === 'admin' ? 'is-selected' : ''} onClick={() => { setErrorMessage(''); setMessage(''); setAgreementView('admin'); }}>
              Agreement administration
            </button>
          )}
        </nav>
      )}

      {errorMessage && <div className="wwu-alert wwu-alert-error" role="alert">{errorMessage}</div>}
      {message && <div className="wwu-alert wwu-alert-success" role="status">{message}</div>}

      {!user ? (
        <section className="wwu-panel wwu-auth-panel">
          <p className="wwu-eyebrow">REVELA ACCOUNT</p>
          <h1>{authMode === 'sign-in' ? 'Sign in to continue' : 'Create your REVELA account'}</h1>
          <p className="wwu-muted">
            Sign in first to view or submit an agreement. Applications are tied to your REVELA account.
          </p>
          <form className="wwu-form" onSubmit={(event) => void submitAuthentication(event)}>
            {authMode === 'sign-up' && (
              <label>
                Full name
                <input value={authFullName} onChange={(event) => setAuthFullName(event.target.value)} required maxLength={200} autoComplete="name" />
              </label>
            )}
            <label>
              Email address
              <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required autoComplete="email" />
            </label>
            <label>
              Password
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required minLength={8} autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} />
            </label>
            <button className="wwu-button wwu-button-primary" type="submit" disabled={isAuthSubmitting}>
              {isAuthSubmitting ? 'Please wait…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="wwu-auth-switch">
            {authMode === 'sign-in' ? 'New to REVELA?' : 'Already have a REVELA account?'}{' '}
            <button type="button" onClick={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setErrorMessage(''); }}>
              {authMode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </section>
      ) : agreementView === 'admin' && !isAdministrator ? (
        <section className="wwu-content">
          <div className="wwu-panel wwu-existing-application" role="alert">
            <h2>Administrator access required</h2>
            <p>This section is available only to REVELA agreement administrators.</p>
            <button type="button" className="wwu-button wwu-button-primary" onClick={() => setAgreementView('apply')}>Return to Work With Us</button>
          </div>
        </section>
      ) : agreementView === 'admin' ? (
        <section className="wwu-content">
          <div className="wwu-section-heading">
            <div>
              <p className="wwu-eyebrow">AUTHORIZED ADMINISTRATORS ONLY</p>
              <h1>Agreement applications</h1>
            </div>
            <button type="button" className="wwu-button wwu-button-secondary" onClick={() => void refreshAdminAgreements()} disabled={adminLoading}>
              {adminLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="wwu-admin-filters">
            <label>
              Search applicants
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Name, email, phone or username" />
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AgreementStatus | 'all')}>
                <option value="all">All statuses</option>
                {agreementStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
            <label>
              Submitted from
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              Submitted to
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>

          <div className="wwu-admin-signature">
            <label>
              Administrator name
              <input value={administratorName} onChange={(event) => setAdministratorName(event.target.value)} maxLength={200} />
            </label>
            <label>
              Administrator electronic signature
              <input value={administratorSignature} onChange={(event) => setAdministratorSignature(event.target.value)} maxLength={200} placeholder="Type your full name to sign approvals" />
            </label>
            <label>
              Agreed commencement date
              <input type="date" value={commencementDate} onChange={(event) => setCommencementDate(event.target.value)} />
            </label>
            <label>
              Rejection reason (optional)
              <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} />
            </label>
          </div>

          {adminLoading ? <p className="wwu-muted">Loading applications…</p> : filteredAdminAgreements.length === 0 ? (
            <p className="wwu-empty">No agreements match these filters.</p>
          ) : (
            <div className="wwu-agreement-list">
              {filteredAdminAgreements.map((agreement) => (
                <article className="wwu-panel wwu-admin-card" key={agreement.id}>
                  <div className="wwu-card-heading">
                    <div>
                      <h2>{agreement.full_name}</h2>
                      <p>{agreement.email} · {agreement.phone}</p>
                    </div>
                    <span className={`wwu-status status-${agreement.status}`}>{statusLabel(agreement.status)}</span>
                  </div>
                  <div className="wwu-detail-grid">
                    <span>Username <strong>{agreement.username || 'Not provided'}</strong></span>
                    <span>Applied <strong>{formatDate(agreement.application_date)}</strong></span>
                    <span>Requested start <strong>{formatDate(agreement.requested_commencement_date)}</strong></span>
                    <span>Agreed start <strong>{formatDate(agreement.commencement_date)}</strong></span>
                    <span>REVELA approval <strong>{agreement.administrator_signed_at ? new Date(agreement.administrator_signed_at).toLocaleString() : 'Pending'}</strong></span>
                    <span>Version <strong>{agreement.agreement_version}</strong></span>
                    <span>Submitted <strong>{new Date(agreement.submitted_at).toLocaleString()}</strong></span>
                  </div>
                  <div className="wwu-card-actions">
                    {(agreement.final_pdf_storage_path || agreement.pdf_storage_path) && (
                      <button type="button" className="wwu-button wwu-button-secondary" onClick={() => void handleDownload(agreement)}>
                        Download PDF
                      </button>
                    )}
                    <button type="button" className="wwu-button wwu-button-secondary" onClick={() => handleBrowserPdf(agreement)}>
                      Print / Save PDF in browser
                    </button>
                    {(agreement.status === 'submitted' || agreement.status === 'pending_review') && (
                      <>
                        <button type="button" className="wwu-button wwu-button-secondary" disabled={busyAgreementId === agreement.id} onClick={() => void saveReviewedAgreement(agreement, 'pending_review')}>
                          Mark pending review
                        </button>
                        <button type="button" className="wwu-button wwu-button-primary" disabled={busyAgreementId === agreement.id || !administratorName.trim() || !administratorSignature.trim()} onClick={() => void saveReviewedAgreement(agreement, 'accepted')}>
                          Accept & sign
                        </button>
                        <button type="button" className="wwu-button wwu-button-danger" disabled={busyAgreementId === agreement.id || !administratorName.trim()} onClick={() => void saveReviewedAgreement(agreement, 'rejected')}>
                          Reject
                        </button>
                      </>
                    )}
                    {(agreement.status === 'accepted_by_revela' || agreement.status === 'active') && (
                      <>
                        <button type="button" className="wwu-button wwu-button-secondary" disabled={busyAgreementId === agreement.id} onClick={() => void regenerateFinalPdf(agreement).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Final PDF regeneration failed.'))}>
                          {busyAgreementId === agreement.id ? 'Generating…' : 'Regenerate final PDF'}
                        </button>
                        {agreement.status === 'accepted_by_revela' && (
                          <button type="button" className="wwu-button wwu-button-primary" disabled={busyAgreementId === agreement.id || !commencementDate} onClick={() => void activateAgreement(agreement)}>
                            Set active
                          </button>
                        )}
                        {agreement.status === 'active' && (
                          <button type="button" className="wwu-button wwu-button-danger" disabled={busyAgreementId === agreement.id} onClick={() => void terminateAgreement(agreement)}>
                            Terminate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {agreement.rejection_reason && <p className="wwu-rejection-reason">Reason: {agreement.rejection_reason}</p>}
                  <details className="wwu-agreement-details">
                    <summary>View applicant details and exact accepted terms</summary>
                    <p><strong>Address:</strong> {agreement.residential_address || 'Not provided'}</p>
                    <p><strong>Applicant signature:</strong> {agreement.signature_text} · {new Date(agreement.accepted_at).toLocaleString()}</p>
                    <pre>{agreement.agreement_snapshot}</pre>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : agreementView === 'mine' ? (
        <section className="wwu-content">
          <div className="wwu-section-heading">
            <div>
              <p className="wwu-eyebrow">YOUR APPLICATIONS</p>
              <h1>My Agreements</h1>
            </div>
            <div className="wwu-card-actions">
              <button type="button" className="wwu-button wwu-button-secondary" onClick={() => void refreshMyAgreements()} disabled={agreementLoading}>
                {agreementLoading ? 'Refreshing…' : 'Refresh status'}
              </button>
              <button type="button" className="wwu-button wwu-button-secondary" onClick={() => setAgreementView('apply')}>New application</button>
            </div>
          </div>
          {localSignedAgreement && (
            <div className="wwu-panel wwu-existing-application" role="status">
              <h2>Browser copy available — not submitted</h2>
              <p>Your signed copy could not be recorded in REVELA. Printing it does not submit an application.</p>
              <button type="button" className="wwu-button wwu-button-primary" onClick={() => handleBrowserPdf(localSignedAgreement)}>
                Print / Save signed PDF
              </button>
            </div>
          )}
          {agreementLoading ? <p className="wwu-muted">Loading your agreements…</p> : agreements.length === 0 ? (
            <p className="wwu-empty">You have not submitted an agreement application yet.</p>
          ) : (
            <div className="wwu-agreement-list">
              {agreements.map((agreement) => (
                <article className="wwu-panel wwu-admin-card" key={agreement.id}>
                  <div className="wwu-card-heading">
                    <div>
                      <h2>{agreement.full_name}</h2>
                      <p>Submitted {new Date(agreement.submitted_at).toLocaleString()} · Version {agreement.agreement_version}</p>
                    </div>
                    <span className={`wwu-status status-${agreement.status}`}>{statusLabel(agreement.status)}</span>
                  </div>
                  <div className="wwu-detail-grid">
                    <span>Application date <strong>{formatDate(agreement.application_date)}</strong></span>
                    <span>Commencement date <strong>{formatDate(agreement.commencement_date)}</strong></span>
                    <span>Acceptance recorded <strong>{new Date(agreement.accepted_at).toLocaleString()}</strong></span>
                    <span>REVELA approval <strong>{agreement.administrator_signed_at ? `Approved ${new Date(agreement.administrator_signed_at).toLocaleString()}` : 'Pending'}</strong></span>
                  </div>
                  <div className="wwu-card-actions">
                    {(agreement.final_pdf_storage_path || agreement.pdf_storage_path) && (
                      <button type="button" className="wwu-button wwu-button-primary" onClick={() => void handleDownload(agreement)}>
                        Download signed agreement
                      </button>
                    )}
                    <button type="button" className="wwu-button wwu-button-secondary" onClick={() => handleBrowserPdf(agreement)}>
                      Print / Save PDF in browser
                    </button>
                  </div>
                  {agreement.rejection_reason && <p className="wwu-rejection-reason">REVELA’s response: {agreement.rejection_reason}</p>}
                  <details className="wwu-agreement-details">
                    <summary>View agreement version accepted</summary>
                    <pre>{agreement.agreement_snapshot}</pre>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="wwu-content">
          <div className="wwu-section-heading">
            <div>
              <p className="wwu-eyebrow">SOCIAL MEDIA AND MARKETING REPRESENTATIVE</p>
              <h1>Marketing Engagement Agreement</h1>
            </div>
          </div>
          {localSignedAgreement && (
            <div className="wwu-panel wwu-existing-application" role="status">
              <h2>Browser copy available — not submitted</h2>
              <p>Your signed copy could not be recorded in REVELA. Printing it does not submit an application.</p>
              <button type="button" className="wwu-button wwu-button-primary" onClick={() => handleBrowserPdf(localSignedAgreement)}>
                Print / Save signed PDF
              </button>
            </div>
          )}

          <>
              <article className="wwu-panel wwu-document">
                <h2>REVELA</h2>
                <h3>{displayedVersion.title}</h3>
                <p className="wwu-version">Agreement version {displayedVersion.agreement_version}</p>
                <pre>{displayedVersion.agreement_text}</pre>
              </article>

              {existingOpenApplication ? (
                <div className="wwu-panel wwu-existing-application">
                  <h2>You already have an open application</h2>
                  <p>Your agreement is currently <strong>{statusLabel(existingOpenApplication.status)}</strong>. You can review its status and PDF in My Agreements.</p>
                  <button type="button" className="wwu-button wwu-button-primary" onClick={() => setAgreementView('mine')}>View My Agreements</button>
                </div>
              ) : !isConfirming ? (
                <form className="wwu-panel wwu-application-form" onSubmit={reviewApplication}>
                  <h2>Application and electronic signature</h2>
                  <p className="wwu-muted">The application date and signature time are recorded by REVELA’s secure database when you submit.</p>
                  <div className="wwu-form-grid">
                    <label>
                      Full legal name
                      <input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={200} autoComplete="name" />
                    </label>
                    <label>
                      REVELA username (if available)
                      <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={80} autoComplete="username" />
                    </label>
                    <label>
                      Email address
                      <input type="email" value={email} readOnly aria-readonly="true" />
                    </label>
                    <label>
                      Phone number
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={7} maxLength={30} autoComplete="tel" />
                    </label>
                    <label className="wwu-form-full">
                      Residential address (optional)
                      <textarea value={residentialAddress} onChange={(event) => setResidentialAddress(event.target.value)} maxLength={500} rows={2} autoComplete="street-address" />
                    </label>
                    <label>
                      Application date
                      <input type="date" value={today} readOnly aria-readonly="true" />
                    </label>
                    <label>
                      Preferred commencement date (optional; subject to agreement)
                      <input type="date" value={requestedCommencementDate} onChange={(event) => setRequestedCommencementDate(event.target.value)} />
                    </label>
                    <label className="wwu-form-full">
                      Electronic signature — type your full legal name
                      <input value={signatureText} onChange={(event) => setSignatureText(event.target.value)} required minLength={2} maxLength={200} autoComplete="off" />
                    </label>
                  </div>
                  <label className="wwu-acceptance">
                    <input type="checkbox" checked={acceptanceChecked} onChange={(event) => setAcceptanceChecked(event.target.checked)} />
                    <span>I have read, understood and agree to the terms and conditions of this REVELA Marketing Engagement Agreement.</span>
                  </label>
                  <button type="submit" className="wwu-button wwu-button-primary">Review before submitting</button>
                </form>
              ) : (
                <section className="wwu-panel wwu-confirmation" aria-labelledby="wwu-confirm-heading">
                  <p className="wwu-eyebrow">FINAL CONFIRMATION</p>
                  <h2 id="wwu-confirm-heading">Confirm and submit your signed agreement</h2>
                  <p>By choosing “Confirm &amp; submit signed agreement”, you confirm that you accept version {displayedVersion.agreement_version} and electronically sign the displayed terms.</p>
                  <div className="wwu-detail-grid">
                    <span>Applicant <strong>{fullName}</strong></span>
                    <span>Email <strong>{email}</strong></span>
                    <span>Phone <strong>{phone}</strong></span>
                    <span>Signature <strong>{signatureText}</strong></span>
                    <span>Application date <strong>{formatDate(today)}</strong></span>
                    <span>Requested start <strong>{formatDate(requestedCommencementDate || null)}</strong></span>
                  </div>
                  <div className="wwu-card-actions">
                    <button type="button" className="wwu-button wwu-button-secondary" onClick={() => setIsConfirming(false)} disabled={isSubmittingAgreement}>
                      Back to application
                    </button>
                    <button type="button" className="wwu-button wwu-button-primary" onClick={() => void confirmSubmission()} disabled={isSubmittingAgreement}>
                      {isSubmittingAgreement ? 'Submitting…' : 'Confirm & submit signed agreement'}
                    </button>
                  </div>
                </section>
              )}
          </>
        </section>
      )}
    </main>
  );
}
