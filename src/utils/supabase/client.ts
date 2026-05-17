import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During static prerendering on Cloudflare CI the NEXT_PUBLIC_* vars may
  // not exist. Return a no-op proxy so the component can render its shell;
  // the real client is created once hydration runs in the browser.
  if (!url || !key) {
    // Minimal stub – any method call returns a chainable no-op.
    const noop: any = () => noop
    noop.then = (cb: any) => Promise.resolve(cb({ data: null, error: null }))
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: () => noop,
    })
  }

  return createBrowserClient(url, key)
}

