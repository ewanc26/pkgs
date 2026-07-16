# AGENTS.md

Guidance for `llm-analyser`, a standalone Python CLI inside the monorepo. It recursively reads `.docx` paragraphs/tables, sends a prompt to a locally configured Ollama model, and writes one Markdown analysis per input file.

## Runtime and data flow

- All implementation is in `main.py`; `python-docx` reads documents and the `ollama` client calls the local Ollama service. `requirements.txt` is the dependency authority. Do not introduce npm tooling.
- The default CLI model is `llama3.2`. `Modelfile` is an optional model recipe; the code does not automatically build or select it, so do not state that it must be loaded unless the CLI default/config is changed accordingly.
- Inputs are discovered recursively, excluding Word `~$` files. On machines with at least four CPUs, independent documents run in a process pool (otherwise threads), up to eight workers.
- The prompt includes document statistics, the file path, the first 500 paragraph characters, and all extracted table text. Results default to `<input-directory-name>_essays/` beside this package; completion order determines numeric filename prefixes.

## Safety and correctness

- Documents may contain private, malicious, or very large content. Ollama is expected to be local, but prompts still cross a process/service boundary. Never log or commit source documents, generated essays, model responses, or paths containing sensitive information.
- Treat `.docx` as untrusted ZIP/XML input. Bound resource use before expanding concurrency or prompt size, preserve per-file error isolation, and do not let one corrupt file abort all completed outputs.
- Generated essays are untrusted model output, not factual analysis. Preserve clear generated-model attribution and do not silently overwrite source documents. If deterministic ordering matters, sort discovery/results rather than relying on concurrent completion order.
- The current prompt truncates paragraphs but includes tables in full. Any privacy/size fix must cover both channels and test empty documents, tables, malformed files, duplicate stems, non-ASCII names, and an output directory inside the scanned tree.

## Validation

- Install with `python3 -m pip install -r packages/llm-analyser/requirements.txt` in an isolated environment. Run `python3 -m py_compile packages/llm-analyser/main.py`; the root `pnpm py:check` masks syntax failures and is not sufficient evidence.
- There is no automated test suite. For behavioural work use disposable `.docx` fixtures and a disposable/local model, exercise thread and process paths where practical, failures from Ollama and parsing, output naming, interruption, and explicit/default output directories.
- Do not commit virtual environments, documents, generated `*_essays` directories, Ollama model data, caches, or transcripts.
