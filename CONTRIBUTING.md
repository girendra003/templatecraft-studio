# Contributing

1. Fork the repository and create a focused branch.
2. Install dependencies with `./run.sh install` and start development with `./run.sh dev`.
3. Run `./run.sh test` and `cd frontend && npm run build`.
4. For UI changes, run the browser scripts with `BASE_URL` pointing at your running server. Set `PUPPETEER_EXECUTABLE_PATH` if Chrome is not at the macOS default path.
5. Describe the user-facing change and validation in a pull request.

Keep example documents and test data fictional. Do not commit uploaded PDFs, credentials, generated outputs, personal project notes, or build caches. Do not describe support for signed, encrypted or arbitrary-size documents without testing it.

Contributions are provided under the project's AGPL-3.0-only license. Existing dependency licenses remain applicable.
