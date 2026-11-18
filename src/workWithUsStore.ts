import dejavusansFontUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
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
  submitted_at?: string;
  status: string;
  administrator_name?: string | null;
  administrator_signature_text?: string | null;
  administrator_signed_at?: string | null;
  administrator_reviewed_at?: string | null;
};

const agreementTable = 'revela_work_with_us_agreements';

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

function formatPdfTimestamp(value: string | null | undefined): string {
  if (!value) return 'Pending';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

let dejavuSansFontData: Promise<string> | null = null;

function getDejaVuSansFontData(): Promise<string> {
  if (!dejavuSansFontData) {
    dejavuSansFontData = fetch(dejavusansFontUrl).then(async (response) => {
      if (!response.ok) throw new Error('The Unicode PDF font could not be loaded.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }).catch((error: unknown) => {
      dejavuSansFontData = null;
      throw error;
    });
  }
  return dejavuSansFontData;
}

export async function downloadAgreementPdf(
  agreement: BrowserAgreementDocument,
  fileName?: string,
): Promise<void> {
  const [{ jsPDF }, fontData] = await Promise.all([
    import('jspdf'),
    getDejaVuSansFontData(),
  ]);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('DejaVuSans.ttf', fontData);
  pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const labelWidth = 54;
  let y = 20;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      pdf.addPage();
      y = 20;
    }
  };

  const addParagraph = (
    text: string,
    options: { bold?: boolean; fontSize?: number; color?: [number, number, number]; after?: number } = {},
  ) => {
    const fontSize = options.fontSize ?? 9.5;
    const lineHeight = fontSize * 0.48;
    pdf.setFont(options.bold ? 'helvetica' : 'DejaVuSans', options.bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...(options.color ?? [35, 35, 35]));
    const lines = pdf.splitTextToSize(text, contentWidth) as string[];
    ensureSpace(lines.length * lineHeight + (options.after ?? 1));
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + (options.after ?? 1);
  };

  const addSectionHeading = (heading: string) => {
    y += 3;
    addParagraph(heading, { bold: true, fontSize: 10.5, color: [169, 0, 10], after: 2 });
  };

  const addDetail = (label: string, value: string) => {
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(value || 'Not provided', contentWidth - labelWidth - 3) as string[];
    const lineHeight = 4.5;
    ensureSpace(Math.max(1, lines.length) * lineHeight + 1);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(65, 65, 65);
    pdf.text(label, margin, y);
    pdf.setFont('DejaVuSans', 'normal');
    pdf.setTextColor(35, 35, 35);
    pdf.text(lines, margin + labelWidth, y);
    y += Math.max(1, lines.length) * lineHeight + 1;
  };

  pdf.setProperties({
    title: `REVELA Marketing Engagement Agreement - ${agreement.full_name}`,
    subject: `Agreement version ${agreement.agreement_version}`,
    author: 'REVELA',
  });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(169, 0, 10);
  pdf.text('REVELA', margin, y);
  y += 8;
  addParagraph('SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT', { bold: true, fontSize: 12, after: 5 });

  addSectionHeading('APPLICANT DETAILS');
  addDetail('Full legal name', agreement.full_name);
  addDetail('REVELA username', agreement.username || 'Not provided');
  addDetail('Email address', agreement.email);
  addDetail('Phone number', agreement.phone);
  addDetail('Residential address', agreement.residential_address || 'Not provided');
  addDetail('Application date', agreement.application_date);
  addDetail('Requested commencement', agreement.requested_commencement_date || 'To be agreed');
  addDetail('Agreed commencement', agreement.commencement_date || 'To be agreed');
  addDetail('Agreement version', agreement.agreement_version);
  addDetail('Submitted at', formatPdfTimestamp(agreement.submitted_at));
  addDetail('Applicant signed at', formatPdfTimestamp(agreement.accepted_at));
  addDetail('REVELA reviewed at', formatPdfTimestamp(agreement.administrator_reviewed_at));

  addSectionHeading('AGREEMENT TERMS ACCEPTED');
  for (const paragraph of agreement.agreement_snapshot.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      y += 2;
      continue;
    }
    const isHeading = /^\d+\.\s|^[A-C]\.\s/.test(paragraph);
    addParagraph(paragraph, { bold: isHeading, fontSize: isHeading ? 9.5 : 9, after: 1.5 });
  }

  addSectionHeading('SIGNATURES');
  addParagraph(`Applicant electronic signature: ${agreement.signature_text}`);
  addParagraph(`Applicant signed at: ${formatPdfTimestamp(agreement.accepted_at)}`);
  addParagraph('REVELA ADMINISTRATOR SIGNATURE', { bold: true, after: 2 });
  if (agreement.administrator_name && agreement.administrator_signature_text && agreement.administrator_signed_at) {
    addParagraph(`REVELA representative: ${agreement.administrator_name}`);
    addParagraph(`REVELA administrator electronic signature: ${agreement.administrator_signature_text}`);
    addParagraph(`REVELA administrator signed at: ${formatPdfTimestamp(agreement.administrator_signed_at)}`);
  } else if (agreement.administrator_name) {
    addParagraph(`REVELA representative: ${agreement.administrator_name}`);
    addParagraph(`REVELA administrator signature: Not signed (${agreement.status.replace(/_/g, ' ')})`);
  } else {
    addParagraph('Pending REVELA review');
  }
  addParagraph(`Agreement status: ${agreement.status.replace(/_/g, ' ')}`, { after: 0 });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`Agreement version ${agreement.agreement_version}`, margin, pageHeight - 9);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  const safeName = agreement.full_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Applicant';
  const pdfOutput = pdf.output('arraybuffer');
  const blob = new Blob([pdfOutput], { type: 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  const requestedFileName = fileName ?? `REVELA-Marketing-Agreement-${safeName}.pdf`;
  link.download = requestedFileName.toLowerCase().endsWith('.pdf')
    ? requestedFileName
    : `${requestedFileName}.pdf`;
  link.style.display = 'none';
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}
