# TemplateCraft Studio

**A visual PDF workspace for fields, signatures and clean exports.**

Turn a PDF into an editable template, arrange fields across pages, update document text, place signatures/stamps, preview filled values, and export PDFs or Signzy-compatible JSON.

[Live demo](https://templatecraft-studio.onrender.com) · [Source](https://github.com/girendra003/templatecraft-studio) · [GitHub Container Registry](https://github.com/girendra003/templatecraft-studio/pkgs/container/templatecraft-studio) · [Docker Hub](https://hub.docker.com/r/girendra003/templatecraft-studio) · [AGPL-3.0 license](LICENSE)

![TemplateCraft Studio landing page](docs/images/landing.png)

## Free and self-contained

- No paid APIs, subscription, AI service, cloud database, analytics or API keys are required.
- PDF processing runs on your own machine/container. UI scripts, icons, styles and sample assets are served locally; the interface uses system fonts and requires no CDN.
- After downloading the built image, the application can run without internet access. Browser network connections are restricted to the app's own origin by its content-security policy.
- Source and bundled artwork are available under AGPL-3.0-only. The app still uses open-source libraries (React, FastAPI, PyMuPDF and others), bundled inside Docker. See [THIRD_PARTY.md](THIRD_PARTY.md).
- Building from source or initially pulling the image requires internet access unless all required packages/base images are already cached. GitHub/Actions/GHCR are publishing tools, not application runtime requirements. The Source link opens GitHub only when you choose to click it.
- There is no application usage fee. Your chosen hardware, hosting, container platform or CI provider may have its own costs and terms; Docker Engine on Linux is an option for running locally.

## Install and run with Docker

You only need Docker and a browser. No Python, Node.js, source-code download or registry login is needed to run the public images.

### 1. Install and start Docker

| Your system | Install | Terminal to use |
| --- | --- | --- |
| Windows | [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/). Complete its WSL 2 setup and use **Linux containers**. | **PowerShell** or Command Prompt |
| macOS (Apple Silicon or Intel) | [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/). Choose the installer for your chip and start Docker Desktop. | **Terminal** (Zsh or Bash) |
| Linux (AMD64 or ARM64) | [Docker Engine](https://docs.docker.com/engine/install/) for your distribution; start the Docker service and configure access for your user. | **Terminal** (Bash or Zsh) |

Run this to confirm Docker is ready:

```text
docker info
```

Run all commands below in your computer's terminal, **outside a container**. On Windows, use PowerShell for these instructions; Git Bash can rewrite Linux paths such as `/tmp`. All Docker commands below are single lines and work in PowerShell, Command Prompt, Bash and Zsh. Copy only the code, without Markdown links or extra backslashes.

### 2. Choose one image source

Both sources serve the same application with Linux AMD64 and ARM64 support. Docker selects the architecture automatically. Choose **Docker Hub** or **GHCR**, not both.

| Source | Image | When to choose it |
| --- | --- | --- |
| [Docker Hub](https://hub.docker.com/r/girendra003/templatecraft-studio) | `girendra003/templatecraft-studio:latest` | Start here; also useful if your network denies GHCR pulls. |
| [GitHub Container Registry (GHCR)](https://github.com/girendra003/templatecraft-studio/pkgs/container/templatecraft-studio) | `ghcr.io/girendra003/templatecraft-studio:latest` | Use if you prefer GitHub's registry or cannot reach Docker Hub. |

**Option A — Docker Hub:** run each line separately:

```text
docker pull girendra003/templatecraft-studio:latest
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true girendra003/templatecraft-studio:latest
```

**Option B — GHCR:** run each line separately:

```text
docker pull ghcr.io/girendra003/templatecraft-studio:latest
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true ghcr.io/girendra003/templatecraft-studio:latest
```

`docker pull` downloads the image; `docker run` creates and starts the app in the background. The run command restricts the container's permissions and provides temporary writable space at `/tmp`.

### 3. Open the app

Wait for startup, then open **http://localhost:8008** in your browser. Choose **Try sample** or upload your PDF.

The port is available only on the computer running Docker. If Docker uses a remote host, your browser's `localhost` points to your own computer instead. To use port 8080, change `127.0.0.1:8008:8008` to `127.0.0.1:8080:8008` and open `http://localhost:8080`.

**Download your work before stopping or restarting the app.** Save changes updates only the active in-memory session; sessions do not survive container/server restarts. No volume is needed because persistent sessions are not implemented. This tool has no authentication or account isolation; use it locally or in a trusted environment. See [deployment notes](SECURITY.md).

### Everyday commands

These commands are the same for both registries and all systems:

| What you want to do | Command |
| --- | --- |
| See running containers | `docker ps` |
| See stopped containers too | `docker ps -a` |
| Follow the app logs | `docker logs --follow templatecraft-studio` (Ctrl+C stops following logs) |
| Stop the app | `docker stop templatecraft-studio` |
| Start an existing stopped app | `docker start templatecraft-studio` |
| Restart the app (clears sessions) | `docker restart templatecraft-studio` |
| Remove a stopped app container | `docker rm templatecraft-studio` |

Run `docker run` only when creating a container. Use `docker start` when the named container already exists.

To check health in **Windows PowerShell**:

```powershell
Invoke-RestMethod http://localhost:8008/api/health
```

In **macOS/Linux Terminal**:

```bash
curl --fail http://localhost:8008/api/health
```

A healthy app returns `{"status":"ok"}`. The image itself does not include `curl`.

### Update to the latest version

Changes merged into `main` automatically publish `latest` to both registries after validation passes. **Existing containers do not update automatically.** Download your work first, then use the commands for your chosen registry below. Run each line separately and continue only if the preceding command succeeds.

**Docker Hub:**

```text
docker pull girendra003/templatecraft-studio:latest
docker stop templatecraft-studio
docker rm templatecraft-studio
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true girendra003/templatecraft-studio:latest
```

**GHCR:**

```text
docker pull ghcr.io/girendra003/templatecraft-studio:latest
docker stop templatecraft-studio
docker rm templatecraft-studio
docker run --detach --name templatecraft-studio --publish 127.0.0.1:8008:8008 --read-only --tmpfs /tmp:size=128m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true ghcr.io/girendra003/templatecraft-studio:latest
```

If you previously changed the name or port, use those same settings when recreating the container. To choose the first release instead of the changing `latest` tag, replace `:latest` with `:0.1.0` in both the pull and run commands. `:0.1` follows releases in the 0.1 series.

### Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| Cannot connect to the Docker daemon | Start Docker Desktop or the Docker Engine service; confirm `docker info` succeeds. |
| `permission denied` accessing Docker, or a Windows named-pipe error | Check Docker's installation/user permissions using the instructions for your system. This happens before the app starts. |
| `denied` or `unauthorized` pulling from a registry | Confirm the exact image name above and try the other registry. Both images are public. Check Docker Desktop's proxy/VPN settings if the problem persists; Docker's network settings can differ from your terminal's. |
| Container name already in use | Run `docker start templatecraft-studio`, or choose another `--name` for a new container. For an update, follow the stop/remove/recreate steps above. |
| Port already allocated or permission denied binding a port | Use another host port, such as `127.0.0.1:8080:8008`, then open `http://localhost:8080`. |
| Browser cannot connect | Check `docker ps -a` and `docker logs templatecraft-studio`; wait for startup and confirm your browser is on the Docker host. |
| Windows reports an incompatible image/platform | Use Docker Desktop's Linux-container engine. This project does not publish native Windows-container images. |

## Host the complete app on Render

Try the complete hosted demo at **https://templatecraft-studio.onrender.com**. It runs both the interface and PDF backend. Use the fictional sample or non-sensitive PDFs; run Docker locally for confidential documents. The free instance may need about a minute to wake after inactivity.

[Deploy to Render](https://render.com/deploy?repo=https://github.com/girendra003/templatecraft-studio)

The included [render.yaml](render.yaml) runs the frontend and Python PDF backend together using the existing Dockerfile. Choose the **Free** instance and review the configuration before deploying. It uses port 8008, `/api/health`, one application worker, and the Singapore region. For a connected GitHub repository, automatic deploys wait for checks on `main` to pass.

Render's free web services sleep after 15 minutes without traffic and take about a minute to wake. Sleep, restarts and redeploys clear editing sessions; download your work first. Free usage and resource limits apply. See [Render's current free-plan limits](https://render.com/docs/free).

A public instance is a shared demo with no authentication or account isolation. Use fictional/non-sensitive PDFs; keep confidential documents in your local Docker installation. See [SECURITY.md](SECURITY.md). Netlify static hosting alone cannot run this Python backend.

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

The included Compose file uses GHCR. To use Docker Hub instead, change its `image:` value to `girendra003/templatecraft-studio:latest`. To update a Compose deployment, download your work, run `docker compose pull`, then `docker compose up --detach --no-build`.

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

Every push or merged pull request to `main` runs validation and then publishes AMD64/ARM64 images with the `latest` tag to GHCR and Docker Hub. Both registries use the same image digest; automatic publishing is configured for this repository. Feature branches and pull requests only run CI; they do not publish images. Publishing runs are serialized so active uploads are not interrupted.

Pushing a semantic-version tag such as `v0.1.1` also publishes release and major/minor tags. The maintainer can run the publishing workflow manually to update `latest` for the selected ref; select `main` for the current main-branch image. GitHub Actions authenticate to GHCR with `GITHUB_TOKEN`; do not put registry tokens in source files. The current package is **Public**. For a new package or fork, verify its visibility in package settings and change it to Public if needed for anonymous pulls.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [THIRD_PARTY.md](THIRD_PARTY.md). Licensed under **AGPL-3.0-only**. PyMuPDF/MuPDF and other dependencies retain their own licenses and notices.

### Registry setup for forks and maintainers

The publishing workflow can also mirror the validated AMD64/ARM64 image to Docker Hub. Create a public `templatecraft-studio` repository in your Docker Hub namespace, set the GitHub Actions repository variable `DOCKERHUB_USERNAME` to your Docker Hub login username, and add a repository secret `DOCKERHUB_TOKEN` containing a Docker Hub access token with write permission. For an organization repository, also set `DOCKERHUB_NAMESPACE` to the organization name and ensure the login has write access there. Keep the token out of source files and chat.

Successful GHCR publication is followed by a Docker Hub mirror using the published image digest, without rebuilding. Main-branch and manual runs mirror `latest`; version-tag runs also mirror release and major/minor tags. These credentials are already configured for this repository. Forks must configure their own credentials and change the hard-coded GHCR namespace in the workflow; without `DOCKERHUB_USERNAME`, the Docker Hub job is skipped. Keep the write token valid and replace the Actions secret when rotating it.
