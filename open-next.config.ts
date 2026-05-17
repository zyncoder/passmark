import { defineCloudflareConfig } from "@opennextjs/cloudflare"

/**
 * OpenNext config for the Cloudflare adapter.
 *
 * We don't enable R2 incremental cache or a Durable Object queue yet — those
 * are useful when pages start using ISR or server actions need durable
 * dispatch. The Passmark app is largely SSR + per-request DB queries, so the
 * defaults are fine.
 *
 * If you later add ISR (e.g. heavily cached marketing pages or report
 * snapshots), wire up the R2 incremental cache override:
 *   import r2 from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
 *   incrementalCache: r2
 */
export default defineCloudflareConfig({})
