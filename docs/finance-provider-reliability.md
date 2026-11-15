# Finance provider lifecycle

`finance_3_card` alone passes `timeout: 40000`, `maxRetries: 0` and a
request-scoped `AbortSignal` to Anthropic SDK 0.32.1. Other modes retain their
existing options. The frontend deadline remains 45 seconds.

The installed SDK's timeout is per fetch attempt and ends when fetch resolves
with headers; JSON body parsing happens afterwards. A separate 40-second race
bounds the complete Finance provider promise, including parsing, and aborts its
signal. It settles even if a mock/transport ignores abort. A timeout returns
HTTP 504 using the existing error envelope; it never returns card sections.

Finance observes a supplied request signal, Node request `aborted`, and response
`close` only before `writableEnded`. Request `close` is deliberately ignored:
normal body completion is not a client cancellation. Listeners and the timer
are removed on every exit. Cancellation records metadata category `aborted`
and status 499; no response is written to an already destroyed/ended response.

## Deployment limitation

The legacy `(req, res)` Vercel handler may see proxy lifecycle rather than the
original client's disconnect. Vercel documents cancellation as an opt-in using
`supportsCancellation`, with a request signal. This repository does not enable
that feature. Enabling it for the shared `/api/chat` path could affect all modes,
so this Finance-only change does not add deployment configuration or migrate
the handler. Local Node disconnect propagation is tested; production propagation
is not guaranteed. The independent deadline still applies without events/signals.

References:
- https://vercel.com/changelog/node-js-vercel-functions-now-support-per-path-request-cancellation
- https://vercel.com/docs/functions/functions-api-reference
- https://nodejs.org/docs/latest-v24.x/api/http.html

Aborting the local HTTP operation does not prove the provider immediately stops
generation or billing. Cold starts and network transit also consume part of the
frontend deadline. Deployment-environment verification and a separately approved
small live quality check remain necessary; neither is performed by these tests.
