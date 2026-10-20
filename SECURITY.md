# Security Policy

GameHub is a full-stack application with authentication, a shared database and
real-time WebSocket messaging, so please treat security reports seriously.

## Supported versions

| Version | Supported |
| --- | --- |
| `v1.0.x` | ✅ |
| `< v1.0` | ❌ |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting instead — it creates an advisory that only you
and the maintainers can see:

1. Go to <https://github.com/elouardighi/GameHub/security/advisories/new>
2. Click **Report a vulnerability**
3. Describe the issue in as much detail as you can

If private reporting is unavailable, open a regular issue that says only
"security report — please open a private channel" with no technical details,
and wait for a maintainer to reach out.

Please include:

- a description of the vulnerability and its impact
- steps to reproduce (a proof of concept is ideal)
- the affected version, commit or file path
- any suggested mitigation

You can expect an acknowledgement within a few days. Once the report is
confirmed we will agree a disclosure timeline with you, credit you in the
advisory unless you prefer otherwise, and publish a fix.

## Scope

In scope:

- Authentication and session handling
- Authorization — accessing other users' data, servers, or private channels
- SQL injection, XSS, CSRF, SSRF
- The Socket.io service — unauthorized access to rooms, messages or signals
- The API routes under `src/app/api`
- Secret or credential exposure
- The demo database that ships with the repository

Out of scope:

- Missing hardening headers on a demo application
- Denial of service through sheer request volume
- Findings from automated scanners with no demonstrated impact
- Social engineering of maintainers

## Security considerations for self-hosted deployments

GameHub ships configured for **local development and demos**. Before exposing it
to the internet you must:

1. **Generate a real `NEXTAUTH_SECRET`**

   ```bash
   openssl rand -base64 32
   ```

   Set it in `.env` or your secret manager. Never reuse the example value.

2. **Set `NEXTAUTH_URL`** to your actual public origin, including the scheme
   (`https://your-domain.example`).

3. **Serve over HTTPS.** Microphone, camera and screen capture only work on
   `https://` or `localhost`. Use the included Caddy configuration as a starting
   point and add TLS.

4. **Do not use the bundled demo database in production.** `db/custom.db`
   contains demo accounts that all share the password `demo`. Delete it, run
   `npm run db:push` and seed your own data.

5. **Rotate the demo credentials.** Anyone who has cloned this repository knows
   that `nova@gamehub.gg` / `demo` works.

6. **Add a TURN server** if you need WebRTC to work across restrictive NATs.
   The bundled Google STUN server does not relay traffic.

7. **Keep dependencies current.** `npm audit` and Dependabot will help.

8. **Back up your database.** It is a single SQLite file.

## Disclosure

We follow the disclosure timeline agreed with the reporter. Once a fix is
released we will publish a GitHub Security Advisory describing the issue, the
affected versions and the upgrade path.
