# Deployment and security

TemplateCraft is intended for local use or a trusted, isolated environment. It has no user authentication, account separation, session expiration policy or durable session database. Do not expose its port directly to the public internet or use a shared deployment for sensitive documents without adding appropriate controls.

The Docker quick start binds only to localhost and runs as a non-root user. For remote access, put authentication, TLS, request-size limits and resource controls at your gateway. The API processes PDFs in memory; document size and complexity affect memory/CPU usage. Use one worker because session state is process-local. Sessions disappear when the server restarts, and Save changes is not durable storage; download files to retain your work.

Uploaded files are not intentionally persisted by the API. Avoid uploading real confidential files to untrusted instances. The fictional sample contains no customer data. This editor does not validate cryptographic signatures, and modifying a signed PDF can invalidate signatures.

To report a vulnerability privately, use the repository's Security advisory reporting feature if available. Do not include secrets or confidential documents in public issues.

The built application has no required external runtime services. Its frontend resource policy allows same-origin resources only (plus local data/blob images), and CDN-backed API documentation pages are disabled. The API schema remains available at `/openapi.json`. Optional source links and build/publish tooling require internet when used.
