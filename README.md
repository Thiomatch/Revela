# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

## Work With Us

The Work With Us agreement feature uses this project's existing Supabase Auth, Postgres, and private Storage.

1. Apply `supabase/migrations/20261118090000_work_with_us_agreements.sql` to the Supabase project using the SQL Editor. This repository does not currently have a configured Supabase CLI migration workflow.
2. Deploy `supabase/functions/generate-work-with-us-pdf` with the Supabase CLI. The function uses Supabase's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` Edge Function secrets; do not add the service-role key to the app.
3. Grant the REVELA agreement administrator claim from a trusted server using Supabase's Auth Admin API: set `app_metadata.revela_agreement_admin` to `true` for the authorized account. Never set this claim from the client or ordinary user metadata. The administrator must sign in again to refresh the claim.

Applicants sign in or create an account through the existing Supabase Auth provider. The main app's existing registration modal stores a local profile only; it is not an authenticated account and cannot securely submit or retrieve agreements.

The migration creates an immutable version 1.0 agreement snapshot, RLS-protected applicant/admin records, audit events, and the private `revela-agreements` bucket. The migration is required to load and submit agreements; the Edge Function is required to generate and download PDFs. If PDF generation is unavailable after a submission, the applicant can retry it from My Agreements.
