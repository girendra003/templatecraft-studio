# Third-party software

TemplateCraft Studio is distributed under AGPL-3.0-only. Copyright 2026 girendra003 and contributors.

The project uses these principal dependencies; their original notices and licenses continue to apply:

| Component | License | Source |
| --- | --- | --- |
| PyMuPDF / MuPDF | AGPL-3.0 or a separate commercial license | https://github.com/pymupdf/PyMuPDF |
| pypdf | BSD-3-Clause | https://github.com/py-pdf/pypdf |
| FastAPI | MIT | https://github.com/fastapi/fastapi |
| Uvicorn | BSD-3-Clause | https://github.com/encode/uvicorn |
| python-multipart | Apache-2.0 | https://github.com/Kludex/python-multipart |
| React / React DOM | MIT | https://github.com/facebook/react |
| Vite | MIT | https://github.com/vitejs/vite |
| TypeScript | Apache-2.0 | https://github.com/microsoft/TypeScript |

The distributed Python packages include their own license notices. Frontend build tooling is used in a separate container build stage. Node lockfiles and pinned direct Python requirements identify the dependency versions. Base images retain their own operating-system package licenses.

The bundled sample PDF, data and demo artwork were created for this project and are fictional. No customer document, real company seal or real signature is distributed.

Public source: https://github.com/girendra003/templatecraft-studio
