# TemplateCraft Studio

**A visual PDF workspace for fields, signatures and clean exports.**

Turn a PDF into an editable template, arrange fields across pages, update document text, place signatures/stamps, preview filled values, and export PDFs or Signzy-compatible JSON.

[Source](https://github.com/girendra003/templatecraft-studio) · [GitHub Container Registry](https://github.com/girendra003/templatecraft-studio/pkgs/container/templatecraft-studio) · [Docker Hub](https://hub.docker.com/r/girendra003/templatecraft-studio) · [AGPL-3.0 license](LICENSE)

![TemplateCraft Studio landing page](docs/images/landing.png)

## Free and self-contained

- No paid APIs, subscription, AI service, cloud database, analytics or API keys are required.
- PDF processing runs on your own machine/container. UI scripts, icons, styles and sample assets are served locally; the interface uses system fonts and requires no CDN.
- After downloading the built image, the application can run without internet access. Browser network connections are restricted to the app's own origin by its content-security policy.
- Source and bundled artwork are available under AGPL-3.0-only. The app still uses open-source libraries (React, FastAPI, PyMuPDF and others), bundled inside Docker. See [THIRD_PARTY.md](THIRD_PARTY.md).
- Building from source or initially pulling the image requires internet access unless all required packages/base images are already cached. GitHub/Actions/GHCR are publishing tools, not application runtime requirements. The Source link opens GitHub only when you choose to click it.
- There is no application usage fee. Your chosen hardware, hosting, container platform or CI provider may have its own costs and terms; Docker Engine on Linux is an option for running locally.

## Run with Docker

No Python or Node.js installation is needed. Install and start Docker Engine or Docker Desktop (using Linux containers), then run this in your computer's terminal, outside any container. The public image requires no GitHub account or registry login.

This single-line command works in Bash, Zsh, PowerShell and Command Prompt:

```text
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true ghcr.io/girendra003/templatecraft-studio:latest
```

For Bash/Zsh, the same command can be split across lines:

```bash
docker run --detach \
  --name templatecraft-studio \
  --publish 127.0.0.1:8008:8008 \
  --read-only \
  --tmpfs /tmp:size=128m,mode=1777 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  ghcr.io/girendra003/templatecraft-studio:latest
```

Open **http://localhost:8008**, choose **Try sample** or upload your PDF.

```bash
# Follow logs
docker logs --follow templatecraft-studio

# Stop and start again
docker stop templatecraft-studio
docker start templatecraft-studio

# Check health from the host terminal (Bash/Zsh)
curl --fail http://localhost:8008/api/health
```

In PowerShell, check health with `Invoke-RestMethod http://localhost:8008/api/health`. The container does not include `curl`; to check from inside it, use Python:

```text
docker exec templatecraft-studio python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8008/api/health').read().decode())"
```

The image supports Linux AMD64 and ARM64, including Docker Desktop on Apple Silicon. Use `:0.1.0` instead of `:latest` to select the first release. To use another local port, change the left side of the mapping, for example `127.0.0.1:8080:8008`.

The address is local to the Docker host. If Docker runs on another computer or a remote Docker context, `localhost` in your browser refers to your own computer instead.

**Save changes updates the active in-memory session. Download your work to keep it.** Sessions do not survive container/server restarts. This is a local/trusted-environment tool, with no authentication or account isolation; do not expose its port directly to the internet. See [deployment notes](SECURITY.md).

### Docker troubleshooting

The same release is also public on **Docker Hub**, which provides another download source if your network cannot pull from GHCR:

```text
docker pull girendra003/templatecraft-studio:latest
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true girendra003/templatecraft-studio:latest
```

Both registries provide `latest`, `0.1` and `0.1.0` for the first release, with Linux AMD64 and ARM64 support. Open `http://localhost:8008` after startup. If a container with this name already exists, start that container or choose a different name before creating another.

| Message or symptom | What to check |
| --- | --- |
| `permission denied` connecting to the Docker socket | Run `docker info` in the host terminal. Fix access to your Docker installation using its platform instructions; this is separate from GHCR image access. |
| Cannot connect to the Docker daemon | Start Docker Desktop or the Docker Engine service and confirm `docker info` succeeds. |
| `denied` or `unauthorized` pulling from GHCR | Confirm the exact image name above with `docker pull ghcr.io/girendra003/templatecraft-studio:latest`. It is public. If you have stale GHCR credentials, `docker logout ghcr.io` clears them for this OS user; this also signs out other GHCR pulls using those credentials. Retry and capture the full error if it persists. |
| Container name already in use | Use `docker start templatecraft-studio` for the existing container, or use a different `--name` for a new one. |
| Port already allocated | Choose another host port, such as `127.0.0.1:8080:8008`, and open `http://localhost:8080`. |
| Browser cannot connect | Check `docker ps -a` and `docker logs templatecraft-studio`; wait for startup and confirm your browser is on the Docker host. |

## Build from source

```bash
git clone https://github.com/girendra003/templatecraft-studio.git
cd templatecraft-studio
docker compose up --build --detach
```

Open http://localhost:8008. `docker compose down` stops and removes the container.

Alternatively:

```bash
docker build --tag templatecraft-studio:local .
docker run --rm -p 127.0.0.1:8008:8008 templatecraft-studio:local
```

To run the published image using the included Compose file:

```bash
docker compose pull
docker compose up --detach --no-build
```

To update a container started with `docker run`, download your work first, then stop/remove the old container, pull the new image, and repeat the run command. No volume is needed: the application does not provide persistent session storage.

## Features

- **Fields:** import existing AcroForm widgets; add, search/filter, rename, duplicate, position, resize and delete fields. Text, multiline, date, time, checkbox, signature and image zones are supported.
- **Document text:** replace selectable PDF text while retaining detected typography where possible.
- **Sign:** upload an image or use the fictional demo stamp/signature; place, resize, undo and save.
- **Test:** fill sample values, preview every page and optionally flatten the output.
- **Export:** editable PDF, blank PDF, Signzy-compatible JSON and ZIP bundle.
- Undo/redo, explicit save, unsaved-change protection, keyboard shortcuts and precise PDF-point positioning.
- Seven color palettes, independent light/dark mode, reduced-motion support and a responsive workspace.
- Interactive landing playground with paper riffle, 3D depth, Pause/Play controls, signature/fill toggles and original/edited comparison.

**Current limits:** the canvas assumes US Letter pages (612 × 792 PDF points). Other page dimensions can display incorrect overlay positions. Existing PDF fields are imported; PDFs without widgets start with an empty field list so you can add your own. There is no OCR or arbitrary-form AI detection. Image/signature zones are image placements, not cryptographic signing. Typography may fall back to portable PDF fonts. Review exported documents before use.

## Fictional sample

The only bundled form is **Client Details & Consent**: two pages, 16 field definitions, 13 blank AcroForm widgets, two signature zones and one demo stamp area. Names, `example.com` addresses and stamp/signature artwork are fictional. No real customer forms or template-specific customer mappings are distributed.

`Try sample`, the landing card and `GET /api/sample` open the same document. Rebuild the sample assets with:

```bash
python3 scripts/generate_sample.py
```

## Develop without Docker

Requires Python 3.12 and Node.js 22 for the documented release environment.

The following development and validation commands use Bash/Zsh (or WSL on Windows):

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
python3 run_server.py 8008
```

Or use `./run.sh` after installing dependencies. `./run.sh dev` runs the API on port 8008 and Vite on 5173; `./run.sh build` builds the frontend. The development launcher uses hot reload; Docker uses one production Uvicorn worker because sessions are process-local.

## Validation

```bash
python3 tests/test_pdf_import.py
python3 tests/test_document_edit.py
python3 tests/test_stamp_editor.py
cd frontend
npm ci
npm run build
BASE_URL=http://127.0.0.1:8008 npm run test:landing
BASE_URL=http://127.0.0.1:8008 npm run test:effects
BASE_URL=http://127.0.0.1:8008 npm run test:e2e
```

Browser tests require Chrome. Set `PUPPETEER_EXECUTABLE_PATH` on Linux or if Chrome is installed somewhere other than the macOS default. `python3 tests/test_container.py` verifies a running container on port 8020 by default; `BASE_URL` overrides that address.

## CLI

```bash
python3 fill_template.py \
  --input examples/sample_data.json \
  --output outputs/filled_sample.pdf \
  --flatten
```

The default template is the bundled sample. Pass `--template` for another AcroForm PDF and `--stamp assets/stamps/demo-stamp.png --stamp-rect 320 490 500 555` to place an image on its first page. Output directories are created automatically and outputs are ignored by Git.

## Releases and contributions

CI builds the frontend/container and tests the PDF engine, offline operation, container API and browser workflows. Changes to `main` go through pull requests with passing `test` CI, an up-to-date branch and resolved review conversations. Force pushes and deletion are blocked. Another person's approval is optional so the sole maintainer can merge after CI passes.

Pushing a semantic-version tag such as `v0.1.0` publishes versioned AMD64/ARM64 images to GHCR after validation passes; the maintainer can also run the publishing workflow manually (which publishes `latest`). GitHub Actions authenticate with `GITHUB_TOKEN`; do not put registry tokens in source files. The current package is **Public**. For a new package or fork, verify its visibility in package settings and change it to Public if needed for anonymous pulls.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [THIRD_PARTY.md](THIRD_PARTY.md). Licensed under **AGPL-3.0-only**. PyMuPDF/MuPDF and other dependencies retain their own licenses and notices.

### Optional Docker Hub publishing (maintainers)

The publishing workflow can also mirror the validated AMD64/ARM64 image to Docker Hub. Create a public `templatecraft-studio` repository in your Docker Hub namespace, set the GitHub Actions repository variable `DOCKERHUB_USERNAME` to your Docker Hub login username, and add a repository secret `DOCKERHUB_TOKEN` containing a Docker Hub access token with write permission. For an organization repository, also set `DOCKERHUB_NAMESPACE` to the organization name and ensure the login has write access there. Keep the token out of source files and chat.

When the variable is configured, successful GHCR publication is followed by a Docker Hub mirror using the published image digest, without rebuilding. Version-tag runs mirror the release, major/minor and `latest` tags; manual runs mirror `latest`. Without the variable, the Docker Hub job is skipped. Use `<namespace>/templatecraft-studio:latest` only after its public publication has been verified.
