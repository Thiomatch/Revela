import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import pdfMakeModule from 'npm:pdfmake@0.2.20/build/pdfmake.js';
import pdfFontsModule from 'npm:pdfmake@0.2.20/build/vfs_fonts.js';

type PdfMakeRuntime = {
  vfs: Record<string, string>;
  createPdf: (definition: Record<string, unknown>) => {
    getBuffer: (callback: (buffer: Uint8Array) => void) => void;
  };
};

type AgreementRecord = {
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
  accepted_at: string;
  submitted_at: string;
  status: string;
  administrator_name: string | null;
  administrator_signature_text: string | null;
  administrator_signed_at: string | null;
};

const pdfMake = pdfMakeModule as unknown as PdfMakeRuntime;
const pdfFonts = pdfFontsModule as unknown as Record<string, string>;
pdfMake.vfs = pdfFonts;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatUtcTimestamp(timestamp: string): string {
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function createPdfDefinition(agreement: AgreementRecord, includeRevelaSignature: boolean): Record<string, unknown> {
  const content: Record<string, unknown>[] = [
    { text: 'REVELA', style: 'brand' },
    { text: 'SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT', style: 'documentTitle' },
    { text: 'APPLICANT DETAILS', style: 'sectionHeading' },
    {
      table: {
        widths: ['*', '*'],
        body: [
          [{ text: 'Full legal name', style: 'tableLabel' }, { text: agreement.full_name }],
          [{ text: 'REVELA username', style: 'tableLabel' }, { text: agreement.username || 'Not provided' }],
          [{ text: 'Email address', style: 'tableLabel' }, { text: agreement.email }],
          [{ text: 'Phone number', style: 'tableLabel' }, { text: agreement.phone }],
          [{ text: 'Residential address', style: 'tableLabel' }, { text: agreement.residential_address || 'Not provided' }],
          [{ text: 'Application date', style: 'tableLabel' }, { text: agreement.application_date }],
          [{ text: 'Requested commencement date', style: 'tableLabel' }, { text: agreement.requested_commencement_date || 'To be agreed' }],
          [{ text: 'Agreed commencement date', style: 'tableLabel' }, { text: agreement.commencement_date || 'To be agreed' }],
          [{ text: 'Agreement version', style: 'tableLabel' }, { text: agreement.agreement_version }],
          [{ text: 'Applicant signed at', style: 'tableLabel' }, { text: formatUtcTimestamp(agreement.accepted_at) }],
          [{ text: 'REVELA approval date', style: 'tableLabel' }, { text: agreement.administrator_signed_at ? formatUtcTimestamp(agreement.administrator_signed_at) : 'Pending' }],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 14],
    },
    { text: 'AGREEMENT TERMS ACCEPTED', style: 'sectionHeading' },
  ];

  for (const paragraph of agreement.agreement_snapshot.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      content.push({ text: ' ', margin: [0, 0, 0, 3] });
      continue;
    }
    const isHeading = /^\d+\.\s|^[A-C]\.\s|^REVELA$/.test(paragraph);
    content.push({
      text: paragraph,
      style: isHeading ? 'termHeading' : 'term',
      margin: [0, 0, 0, isHeading ? 3 : 1],
    });
  }

  content.push(
    { text: 'SIGNATURES', style: 'sectionHeading', margin: [0, 14, 0, 6] },
    { text: `Applicant electronic signature: ${agreement.signature_text}`, style: 'signature' },
    { text: `Applicant signed at: ${formatUtcTimestamp(agreement.accepted_at)}`, style: 'signature' },
  );
  if (includeRevelaSignature && agreement.administrator_name && agreement.administrator_signature_text && agreement.administrator_signed_at) {
    content.push(
      { text: `REVELA representative: ${agreement.administrator_name}`, style: 'signature' },
      { text: `REVELA representative electronic signature: ${agreement.administrator_signature_text}`, style: 'signature' },
      { text: `REVELA representative signed at: ${formatUtcTimestamp(agreement.administrator_signed_at)}`, style: 'signature' },
    );
  } else {
    content.push({ text: 'REVELA representative signature: Pending REVELA review', style: 'signature' });
  }
  content.push(
    { text: `Agreement status: ${agreement.status.replace(/_/g, ' ')}`, style: 'signature', margin: [0, 8, 0, 0] },
    {
      text: 'The applicant confirmed acceptance of the agreement terms recorded in this versioned agreement snapshot.',
      style: 'smallNote',
      margin: [0, 5, 0, 0],
    },
  );

  return {
    pageSize: 'A4',
    pageMargins: [44, 58, 44, 48],
    header: {
      text: 'REVELA | SOCIAL MEDIA MARKETING ENGAGEMENT',
      margin: [44, 24, 44, 0],
      fontSize: 8,
      color: '#777777',
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Agreement version ${agreement.agreement_version}  |  Page ${currentPage} of ${pageCount}`,
      alignment: 'center',
      margin: [0, 0, 0, 20],
      fontSize: 8,
      color: '#777777',
    }),
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.25, color: '#202124' },
    styles: {
      brand: { fontSize: 20, bold: true, color: '#a9000a', margin: [0, 0, 0, 3] },
      documentTitle: { fontSize: 13, bold: true, margin: [0, 0, 0, 16] },
      sectionHeading: { fontSize: 10, bold: true, color: '#a9000a', margin: [0, 0, 0, 6] },
      tableLabel: { bold: true, color: '#424242' },
      termHeading: { bold: true, fontSize: 9.5 },
      term: { fontSize: 9 },
      signature: { fontSize: 9, margin: [0, 2, 0, 2] },
      smallNote: { fontSize: 8, italics: true, color: '#555555' },
    },
    content,
  };
}

function createPdfBlob(agreement: AgreementRecord, includeRevelaSignature: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(createPdfDefinition(agreement, includeRevelaSignature))
        .getBuffer((buffer) => {
          const bytes = new Uint8Array(buffer.byteLength);
          bytes.set(buffer);
          resolve(new Blob([bytes.buffer], { type: 'application/pdf' }));
        });
    } catch (error) {
      reject(error);
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Required Supabase Edge Function environment is missing.');
    return jsonResponse({ error: 'PDF generation is not configured.' }, 500);
  }
  if (!authorization) return jsonResponse({ error: 'Authentication required.' }, 401);

  let requestBody: { agreementId?: unknown; final?: unknown };
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }
  if (typeof requestBody.agreementId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestBody.agreementId)) {
    return jsonResponse({ error: 'A valid agreement ID is required.' }, 400);
  }
  const includeRevelaSignature = requestBody.final === true;

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Authentication required.' }, 401);
    const user = authData.user;
    const isAdministrator = user.app_metadata?.revela_agreement_admin === true;
    if (includeRevelaSignature && !isAdministrator) {
      return jsonResponse({ error: 'Administrator access required.' }, 403);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: agreement, error: agreementError } = await serviceClient
      .from('revela_work_with_us_agreements')
      .select('*')
      .eq('id', requestBody.agreementId)
      .maybeSingle();
    if (agreementError) throw agreementError;
    if (!agreement) return jsonResponse({ error: 'Agreement not found.' }, 404);

    if (!includeRevelaSignature && agreement.applicant_user_id !== user.id) {
      return jsonResponse({ error: 'You can only generate your own agreement PDF.' }, 403);
    }
    if (includeRevelaSignature) {
      if (!['accepted_by_revela', 'active'].includes(agreement.status)
        || !agreement.administrator_name
        || !agreement.administrator_signature_text
        || !agreement.administrator_signed_at) {
        return jsonResponse({ error: 'The REVELA approval signature is not complete.' }, 409);
      }
    }

    const pdf = await createPdfBlob(agreement as AgreementRecord, includeRevelaSignature);
    const path = `${agreement.applicant_user_id}/${agreement.id}${includeRevelaSignature ? '-final' : ''}.pdf`;
    const { error: uploadError } = await serviceClient.storage
      .from('revela-agreements')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;

    const pathField = includeRevelaSignature ? 'final_pdf_storage_path' : 'pdf_storage_path';
    let updateQuery = serviceClient
      .from('revela_work_with_us_agreements')
      .update({ [pathField]: path })
      .eq('id', agreement.id);
    if (includeRevelaSignature) {
      updateQuery = updateQuery.in('status', ['accepted_by_revela', 'active']);
    } else {
      updateQuery = updateQuery.eq('applicant_user_id', user.id);
    }
    const { data: updatedAgreement, error: updateError } = await updateQuery.select('*').single();
    if (updateError) throw updateError;

    const { error: auditError } = await serviceClient
      .from('revela_work_with_us_audit_events')
      .insert({
        agreement_id: agreement.id,
        actor_user_id: user.id,
        event_type: includeRevelaSignature ? 'final_agreement_pdf_generated' : 'applicant_agreement_pdf_generated',
      });
    if (auditError) throw auditError;

    return jsonResponse(updatedAgreement as Record<string, unknown>, 200);
  } catch (error) {
    console.error('Work With Us PDF generation failed:', error);
    return jsonResponse({ error: 'The agreement PDF could not be generated.' }, 500);
  }
});
