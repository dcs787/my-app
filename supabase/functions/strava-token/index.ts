// Supabase Edge Function entry point (Deno). Deploy: see SETUP.md.
// Set secrets with: supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
import { handle } from './handler.ts';

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void };

Deno.serve((req) =>
  handle(req, { STRAVA_CLIENT_ID: Deno.env.get('STRAVA_CLIENT_ID'), STRAVA_CLIENT_SECRET: Deno.env.get('STRAVA_CLIENT_SECRET') }),
);
