import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Supabase Auth callback handler.
 *
 * Supabase emails a link like:
 *   https://your-app.netlify.app/auth/callback?code=XXXX&next=/
 *
 * This route exchanges the one-time `code` for a real session,
 * sets the session cookie, then redirects the user onward.
 *
 * Configure this URL in:
 *   Supabase Dashboard → Authentication → URL Configuration
 *   → "Redirect URLs" → add  https://your-app.netlify.app/auth/callback
 *   → "Site URL"      → https://your-app.netlify.app
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the original destination (or home)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to login with an error hint
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
