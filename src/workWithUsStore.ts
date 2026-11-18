import { supabase } from './supabaseClient';

export type AgreementStatus =
  | 'submitted'
  | 'pending_review'
  | 'accepted_by_revela'
  | 'active'
  | 'rejected'
  | 'terminated';

export type WorkWithUsAgreement = {
  id: string;
  applicant_user_id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string;
  residential_address: string | null;
  application_date: string;
  requested_commencement_date: string | null;
  commencement_date: string | null;
  agreement_version: string;
  agreement_snapshot: string;
  signature_text: string;
  acceptance_status: 'accepted';
  accepted_at: string;
  submitted_at: string;
  pdf_storage_path: string | null;
  final_pdf_storage_path: string | null;
  status: AgreementStatus;
  administrator_name: string | null;
  administrator_signature_text: string | null;
  administrator_signed_at: string | null;
  administrator_reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AgreementVersion = {
  agreement_version: string;
  title: string;
  agreement_text: string;
  isFallback?: boolean;
  fallbackReason?: string;
};

export const DEFAULT_AGREEMENT_VERSION: AgreementVersion = {
  agreement_version: '1.0',
  title: 'SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT',
  agreement_text: `REVELA
SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT

1. POSITION AND APPOINTMENT

REVELA engages the Marketing Representative to manage and promote the official social media presence of REVELA, particularly its official Facebook page, with the aim of increasing brand awareness, audience engagement, app downloads and overall platform growth.

2. DUTIES AND RESPONSIBILITIES

A. SOCIAL MEDIA MANAGEMENT

- Create and manage content on the official REVELA Facebook page.
- Publish promotional posts and updates consistently.
- Engage followers and respond to relevant comments and enquiries.
- Promote REVELA and encourage potential users to download and use the application.

B. CONTENT CREATION AND PROMOTION

- Publish movie trailers, thrillers and promotional materials supplied by REVELA.
- Create at least two (2) original short promotional videos weekly.
- Develop creative promotional ideas to attract new users.
- Write engaging captions and descriptions for published content.

C. GROWTH AND REPORTING

- Work towards increasing the Facebook page's followers and engagement.
- Encourage genuine downloads and registrations on the REVELA application.
- Submit a weekly report on promotional activities, page growth, engagement and referrals.

3. MONTHLY STIPEND

The Marketing Representative shall receive a monthly stipend of ₦15,000 (Fifteen Thousand Naira Only) during the initial engagement period.

Payment shall be made monthly, subject to fulfilment of the agreed responsibilities and payment arrangements.

4. INITIAL TRIAL PERIOD

The engagement shall begin with an initial trial period of thirty (30) days.

At the end of the trial period, both parties shall review the performance, responsibilities and effectiveness of the arrangement.

REVELA reserves the right to review the stipend and working arrangement based on the company's financial position and the Marketing Representative's performance, subject to mutual agreement.

5. PERFORMANCE INCENTIVES

In addition to the monthly stipend, REVELA may introduce performance-based bonuses for outstanding marketing results.

Such incentives may be based on:

- Verified new users attracted to the application.
- Growth in Facebook followers and engagement.
- Successful promotional campaigns.
- Other measurable marketing achievements.

The specific bonus amounts and targets shall be agreed upon separately by both parties.

Performance bonuses do not constitute ownership or equity in REVELA.

6. OWNERSHIP OF SOCIAL MEDIA ACCOUNTS

- All official REVELA social media accounts and pages shall remain the property of REVELA.
- The Marketing Representative shall receive the necessary administrative access to perform her duties.
- She shall not transfer ownership, change account ownership or restrict REVELA's access.
- All passwords, account information and administrative privileges shall remain under the control of REVELA.
- Upon termination of this engagement, her administrative access shall be withdrawn.

7. OWNERSHIP OF CONTENT

All promotional videos, graphics, captions, advertisements and other materials specifically created and paid for under this engagement shall belong to REVELA, subject to applicable copyright law and any third-party rights.

The Marketing Representative agrees that REVELA may use such materials across its official platforms for promotional and commercial purposes.

Any third-party music, video clips, images or other copyrighted materials must have the necessary permissions or licences before publication.

8. CONFIDENTIALITY

The Marketing Representative shall not disclose confidential company information, business strategies, administrative credentials, user information or other non-public information belonging to REVELA without authorization.

9. TERMINATION

Either party may terminate this engagement by giving seven (7) days' written notice.

REVELA may terminate the engagement immediately in cases of serious misconduct, unauthorized access or disclosure of confidential information, fraud or deliberate misuse of company accounts.

Any stipend already earned up to the effective termination date shall be settled, subject to applicable law and agreed payment terms.

10. NATURE OF ENGAGEMENT

This agreement establishes a marketing engagement only. It does not grant the Marketing Representative ownership, partnership shares, equity or permanent entitlement to REVELA's profits or advertising revenue.

Any future change to the arrangement must be agreed upon in writing.

11. INTERIM AGREEMENT AND FUTURE REVIEW

This agreement serves as an initial engagement agreement for REVELA during its early development and operational stage.

The parties acknowledge that the agreement may be reviewed, updated or replaced by a more comprehensive agreement in the future.

Any revision shall be communicated to the Marketing Representative and shall require her acceptance where applicable.

12. ACCEPTANCE AND SIGNATURES

Both parties confirm that they have read, understood and agreed to the terms of this engagement.

The applicant must electronically sign before the agreement is considered completed.`,
  isFallback: true,
};

export type BrowserAgreementDocument = {
  full_name: string;
  username: string | null;
  email: string;
  phone: string;
  residential_address: string | null;
  application_date: string;
  requested_commencement_date: string | null;
  commencement_date: string | null;
  agreement_version: string;
  agreement_snapshot: string;
  signature_text: string;
  accepted_at: string;
  status: string;
  administrator_name?: string | null;
  administrator_signature_text?: string | null;
  administrator_signed_at?: string | null;
};

const agreementTable = 'revela_work_with_us_agreements';
const agreementBucket = 'revela-agreements';

function throwSupabaseError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function getActiveAgreementVersion(): Promise<AgreementVersion> {
  const { data, error } = await supabase
    .from('revela_work_with_us_versions')
    .select('agreement_version, title, agreement_text')
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) {
    return {
      ...DEFAULT_AGREEMENT_VERSION,
      fallbackReason: error?.message ?? 'No active agreement version is configured.',
    };
  }
  return data as AgreementVersion;
}

export async function getMyWorkAgreements(): Promise<WorkWithUsAgreement[]> {
  const { data, error } = await supabase
    .from(agreementTable)
    .select('*')
    .order('submitted_at', { ascending: false });
  throwSupabaseError(error);
  return (data ?? []) as WorkWithUsAgreement[];
}

export async function getAllWorkAgreements(): Promise<WorkWithUsAgreement[]> {
  const { data, error } = await supabase
    .from(agreementTable)
    .select('*')
    .order('submitted_at', { ascending: false });
  throwSupabaseError(error);
  return (data ?? []) as WorkWithUsAgreement[];
}

export async function submitWorkAgreement(details: {
  agreementVersion: string;
  fullName: string;
  username: string;
  phone: string;
  residentialAddress: string;
  requestedCommencementDate: string;
  signatureText: string;
  acceptanceChecked: boolean;
}): Promise<WorkWithUsAgreement> {
  const { data, error } = await supabase.rpc('submit_revela_work_with_us_agreement', {
    p_agreement_version: details.agreementVersion,
    p_full_name: details.fullName,
    p_username: details.username,
    p_phone: details.phone,
    p_residential_address: details.residentialAddress,
    p_requested_commencement_date: details.requestedCommencementDate || null,
    p_signature_text: details.signatureText,
    p_acceptance_checked: details.acceptanceChecked,
  });
  throwSupabaseError(error);
  if (!data) throw new Error('The agreement submission did not return a record.');
  return data as WorkWithUsAgreement;
}

export async function reviewWorkAgreement(input: {
  agreementId: string;
  decision: 'pending_review' | 'accepted' | 'rejected';
  administratorName: string;
  administratorSignatureText?: string;
  rejectionReason?: string;
}): Promise<WorkWithUsAgreement> {
  const { data, error } = await supabase.rpc('review_revela_work_with_us_agreement', {
    p_agreement_id: input.agreementId,
    p_decision: input.decision,
    p_administrator_name: input.administratorName,
    p_administrator_signature_text: input.administratorSignatureText ?? null,
    p_rejection_reason: input.rejectionReason ?? null,
  });
  throwSupabaseError(error);
  if (!data) throw new Error('The agreement review did not return an updated record.');
  return data as WorkWithUsAgreement;
}

export async function activateWorkAgreement(
  agreementId: string,
  commencementDate: string,
): Promise<WorkWithUsAgreement> {
  const { data, error } = await supabase.rpc('activate_revela_work_with_us_agreement', {
    p_agreement_id: agreementId,
    p_commencement_date: commencementDate,
  });
  throwSupabaseError(error);
  if (!data) throw new Error('The agreement activation did not return an updated record.');
  return data as WorkWithUsAgreement;
}

export async function terminateWorkAgreement(
  agreementId: string,
  reason: string,
): Promise<WorkWithUsAgreement> {
  const { data, error } = await supabase.rpc('terminate_revela_work_with_us_agreement', {
    p_agreement_id: agreementId,
    p_reason: reason,
  });
  throwSupabaseError(error);
  if (!data) throw new Error('The agreement termination did not return an updated record.');
  return data as WorkWithUsAgreement;
}

export async function generateWorkAgreementPdf(
  agreementId: string,
  final = false,
): Promise<WorkWithUsAgreement> {
  const { data, error } = await supabase.functions.invoke('generate-work-with-us-pdf', {
    body: { agreementId, final },
  });
  throwSupabaseError(error);
  if (!data) throw new Error('The agreement PDF could not be generated.');
  return data as WorkWithUsAgreement;
}

export async function downloadAgreementPdf(storagePath: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(agreementBucket)
    .createSignedUrl(storagePath, 60);
  throwSupabaseError(error);
  if (!data?.signedUrl) throw new Error('A secure download link could not be created.');

  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function printAgreementPdfInBrowser(agreement: BrowserAgreementDocument): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('The print window was blocked. Allow pop-ups and try again.');
  printWindow.opener = null;

  const details = [
    ['Full legal name', agreement.full_name],
    ['REVELA username', agreement.username || 'Not provided'],
    ['Email address', agreement.email],
    ['Phone number', agreement.phone],
    ['Residential address', agreement.residential_address || 'Not provided'],
    ['Application date', agreement.application_date],
    ['Requested commencement date', agreement.requested_commencement_date || 'To be agreed'],
    ['Agreed commencement date', agreement.commencement_date || 'To be agreed'],
    ['Agreement version', agreement.agreement_version],
    ['Applicant signed at', new Date(agreement.accepted_at).toLocaleString()],
  ];
  const detailRows = details.map(([label, value]) => (
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  )).join('');
  const terms = escapeHtml(agreement.agreement_snapshot);
  const representativeSignature = agreement.administrator_name
    && agreement.administrator_signature_text
    && agreement.administrator_signed_at
    ? `<p>REVELA representative: ${escapeHtml(agreement.administrator_name)}</p>
       <p>REVELA representative electronic signature: ${escapeHtml(agreement.administrator_signature_text)}</p>
       <p>REVELA representative signed at: ${escapeHtml(new Date(agreement.administrator_signed_at).toLocaleString())}</p>`
    : '<p>REVELA representative signature: Pending REVELA review</p>';
  const title = `REVELA Agreement - ${agreement.full_name}`;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { color: #202124; font: 10pt Arial, sans-serif; line-height: 1.45; }
          h1 { color: #a9000a; font-size: 20pt; margin-bottom: 4px; }
          h2 { font-size: 13pt; margin-top: 0; }
          h3 { color: #a9000a; font-size: 11pt; margin: 18px 0 6px; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; }
          th, td { border-bottom: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
          th { width: 34%; }
          pre { font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; }
          .no-print { background: #f3f3f3; padding: 10px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <p class="no-print">In the print dialog, choose “Save as PDF” to download this signed agreement.</p>
        <h1>REVELA</h1>
        <h2>SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT</h2>
        <h3>APPLICANT DETAILS</h3>
        <table><tbody>${detailRows}</tbody></table>
        <h3>AGREEMENT TERMS ACCEPTED</h3>
        <pre>${terms}</pre>
        <h3>SIGNATURES</h3>
        <p>Applicant electronic signature: ${escapeHtml(agreement.signature_text)}</p>
        <p>Applicant signed at: ${escapeHtml(new Date(agreement.accepted_at).toLocaleString())}</p>
        ${representativeSignature}
        <p>Agreement status: ${escapeHtml(agreement.status.replace(/_/g, ' '))}</p>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
