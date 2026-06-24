# Sentinel Journal

## 2024-06-15 - [Security Enhancement] Cloudflare Pages Missing Security Headers
**Vulnerability:** Static sites on Cloudflare Pages/Workers do not send basic security headers by default. This leaves the site open to attacks like clickjacking, MIME-type sniffing, and cross-site scripting (XSS).
**Learning:** Cloudflare Pages supports a `_headers` file in the build output directory to automatically attach security headers to responses. This is a crucial security enhancement for static sites without a backend server to set headers.
**Prevention:** Include a `_headers` file with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and basic `Content-Security-Policy` for all static Cloudflare Pages deployments.
