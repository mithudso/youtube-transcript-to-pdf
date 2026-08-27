# Security Policy

## Supported versions

The latest release on `main` is the only supported version.

## Reporting a vulnerability

Report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/mithudso/youtube-transcript-to-pdf/security/advisories/new).
Please do not open a public issue for a security problem.

Include, where you can:

- what an attacker can do, and what they need in order to do it
- the affected file and, ideally, a line reference
- a reproduction: a URL, a video, or a page that triggers the behaviour

Expect an acknowledgement within a week.

## Scope

This extension runs entirely in the browser. There is no server, no account,
and no telemetry, so the interesting attack surface is narrow:

- **In scope** — code injected into a YouTube page by
  `src/content/scrape-transcript.js`; anything that could turn page-controlled
  text into executable code in an extension context; a privilege escalation
  through the declared permissions; a path that leaks transcript data off the
  machine.
- **Out of scope** — YouTube's own behaviour, and the fact that a transcript
  the user chose to export lands in their own Downloads folder.

See [docs/SECURITY.md](../docs/SECURITY.md) for the threat model.
