# Security

To report a vulnerability, see [.github/SECURITY.md](../.github/SECURITY.md).

## Posture

The extension has no server, no account, no telemetry, and no dependencies. It
talks to exactly one origin, `youtube.com`, and it does so without cookies.
Transcript data exists in memory, in `chrome.storage.session` for the moment
between the popup and the printable viewer, and in whatever PDF the user chose
to save.

## Permissions

| Permission | Why it is needed | What it would allow if abused |
| --- | --- | --- |
| `tabs` | Read the active tab's URL to prefill the input; find a tab already open on the requested video. | Reading URLs and titles of all open tabs. |
| `scripting` | Inject the transcript-panel reader when the direct download is blocked. | Running code in pages matching the host permissions. |
| `storage` | Persist formatting preferences; hand the transcript to the printable viewer. | Reading extension-local storage. |
| `downloads` | Save the generated PDF. | Writing files to the Downloads folder. |
| `host_permissions: youtube.com, m.youtube.com` | Fetch watch pages and caption tracks; inject into a YouTube tab. | Network access to YouTube only. |

Deliberately **not** requested: `<all_urls>`, `cookies`, `webRequest`,
`history`, `identity`, `nativeMessaging`. The `youtu.be` host permission was
removed once it was clear URLs are normalised to `youtube.com` before any
request.

Any new permission needs a written justification in the pull request and a row
in this table.

## Threat model

**Assets.** The transcript, the user's browsing context (open tab URLs), and
the user's YouTube session — which the extension deliberately never touches.

**Trust boundaries.** Everything crossing from a YouTube page into the
extension is untrusted: watch-page HTML, caption payloads, and text scraped
from the transcript panel. All of it is attacker-influenceable by whoever
controls a video's metadata or captions.

### STRIDE

**Spoofing.** A page could pose as YouTube. `parseVideoId` checks the hostname
against an exact allowlist, so `youtube.com.evil.test` and
`evil.test/youtube.com` are both rejected. Requests are built from a canonical
URL constructed from the parsed video id, never from user-supplied URL text.

**Tampering.** A malicious watch page could serve a hostile caption-track list.
The `baseUrl` is used only as a fetch target, and the response is parsed as
JSON or scanned with a regex — never evaluated. A caption `baseUrl` pointing off
YouTube would be fetched, which is why host permissions stay narrow; the
response can only ever become inert text.

**Repudiation.** Not applicable — single user, local, no multi-party actions.

**Information disclosure.** The main risk is transcript data escaping the
machine. There is no outbound path except YouTube: no analytics, no error
reporting, no remote logging. `credentials: 'omit'` on every request means the
extension cannot act as the signed-in user or leak session cookies. The
printable viewer deletes its session-storage payload immediately after render
rather than leaving it for the browser session.

**Denial of service.** A pathological video could return an enormous transcript.
Requests have a 15-second timeout; tab loads have 20. A very large transcript
would make the popup slow but stays bounded by what YouTube itself renders.

**Elevation of privilege.** The dangerous shape would be page-controlled text
becoming code in an extension context. Mitigations: the extension CSP blocks
`eval`, `new Function`, and inline scripts; the codebase contains no `innerHTML`,
`outerHTML`, `eval`, or `new Function`; all rendering is `textContent`; scripts
are loaded from files, never from strings; the injected reader is injected on
demand rather than declared, so it does not run on every YouTube page.

## Injected code

`src/content/scrape-transcript.js` runs in the isolated world, not the page's
main world, so page JavaScript cannot reach its variables. It reads the DOM and
returns strings. It never writes to the page, never clicks anything except the
transcript control, and never evaluates page-supplied values.

## Secrets

None. There are no API keys, tokens, or credentials anywhere in the repository,
and there is nothing for a leak to expose. `.gitignore` covers `.env` regardless.

## Supply chain

Zero runtime and zero development dependencies. `npm install` has nothing to
install and CI runs without one. The only third-party code in CI is the pinned
GitHub Actions, which Dependabot tracks monthly.

## Known limits

The transcript-panel reader depends on YouTube's private markup. That is a
fragility problem, not a security one — when it breaks, it returns nothing.

Users grant an extension with `youtube.com` host permissions the ability to read
YouTube pages. That is inherent to what this does.
