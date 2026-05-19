# AGENTS.md

## Purpose
`llm-analyser` is a standalone Python tool for analysing `.docx` files and generating essays using a locally-running Ollama LLM. It is not an npm package and has no build step.

## Architectural Concepts
- **Python / Ollama**: Uses the Ollama HTTP API to run local LLM inference; no cloud API keys required.
- **Modelfile**: The `Modelfile` defines the Ollama model configuration used for analysis.
- **Single-entry**: All logic lives in `main.py`; `requirements.txt` lists Python dependencies.

## Core Files
- `main.py`: Entry point — reads `.docx` input, calls Ollama, writes essay output.
- `Modelfile`: Ollama model definition.
- `requirements.txt`: Python dependencies (install with `pip install -r requirements.txt`).

## Instructions for Agents
- This is a Python project. Do not add `package.json` or npm tooling.
- Requires Ollama running locally with the model from `Modelfile` loaded.
- No build step — run directly with `python main.py`.
- Full documentation is maintained at `docs.ewancroft.uk/projects/llm-analyser`.
