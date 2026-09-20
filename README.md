# XIGA PRO Login

Mobile-first login/signup page designed to match the XIGA PRO dark blue/green UI.

## Setup
1. Open `app.js`.
2. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_PUBLISHABLE_KEY`.
3. Upload the files to a static host such as Render.
4. The Generate Key and Activate Key buttons call the deployed
   `xiga-request-activation-key` Edge Function.

## Important
Do not put a Supabase secret/service key or Resend API key in this frontend.

The current Edge Function supports `request` and `activate`. A later backend
update should add a secure `status` action so the dashboard can automatically
show subscription expiry and lock an expired account.

This login page alone does not secure the direct Streamlit XIGA PRO URL.
Final app access must also be enforced by XIGA PRO/backend.
