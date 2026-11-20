# Contributing to llm-analyser

Python utility for analysing `.docx` files with Ollama. It lives in the [ewanc26/pkgs](https://github.com/ewanc26/pkgs) monorepo.

Start with the [root contributing guide](../../CONTRIBUTING.md) for the workflow common to every package: development setup, commit style, the checks expected before opening a pull request, and the licence terms for contributions.

## Notes for this package

- Not part of the pnpm workspace: install dependencies with `pip install -r requirements.txt` (or `pnpm py:install` from the repo root).
- Syntax-check with `pnpm py:check` from the repo root, which runs `python3 -m py_compile` across the packages.
- It carries a `Modelfile` — if you change prompting behaviour, keep the Modelfile and the code in step.
- Runs against a local Ollama, so document any new model requirements in the README.
