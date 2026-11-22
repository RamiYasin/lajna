MINISTRY OF DEFENSE OVERSIGHT WEBSITE — STATIC HTML/CSS/JS

Files:
- index.html
- style.css
- script.js
- config.js (public Supabase connection settings)

Setup:
1. Open config.js.
2. Keep the existing project URL.
3. Replace PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE with the project's Publishable key (or legacy anon key) from Supabase > Project Settings > API.
4. Upload all four files to your static host (or open via a local web server).

Read-only behavior:
- The website only runs SELECT queries against sectors, members and elite_members.
- It contains no INSERT, UPDATE, or DELETE requests.
- Supabase dashboard administrators can continue editing tables and rows in the Supabase dashboard.
- The Supabase anon role must have SELECT grants and SELECT RLS policies on the three tables for public website viewing.
- Do not put a service_role key in config.js.

Tables/columns expected:
- sectors: id, sector_name, discord_mention, status, sort_order
- members: id, member_name, mention, sector, sort_order
- elite_members: id, member_name, mention, role, sort_order

The fieldwork and decision forms are local previews for copying only; they do not write to Supabase.
