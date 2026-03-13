# LLM Analyser

This project provides a tool to analyze `.docx` files and generate analytical essays using Ollama.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.x**: You can download it from [python.org](https://www.python.org/downloads/).
- **Ollama**: Follow the installation instructions on the [Ollama website](https://ollama.com/).

## Setup

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone git@github.com:ewanc26/llm-analyser.git
    cd llm-analyser
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required Python packages:**

    ```bash
    pip install -r requirements.txt
    ```

    *Note: If `requirements.txt` does not exist, you will need to create it based on the project's dependencies (e.g., `python-docx`, `ollama`).*

4.  **Pull the required Ollama model:**

    This project uses the `llama3.2` model by default. You can pull it using the Ollama CLI:

    ```bash
    ollama create document-analyser -f './Modelfile'
    ```

    If you wish to use a different model, update the `Modelfile` and the `main.py` script accordingly.

## Usage

To analyze `.docx` files in a directory and generate essays, run the `main.py` script:

```bash
python3 main.py <directory_to_analyze>
```

**Arguments:**

-   `<directory_to_analyse>`: The path to the directory containing the `.docx` files you want to analyze.

**Example:**

```bash
python main.py ~/Documents/Literature/Poetry 
```

This command will analyze all `.docx` files in the `~/Documents/Literature/Poetry` directory and generate essays using the `llama3.2` model. The essays will be saved in a new folder named `Poetry_essays` within the project root.

## Modifying the Ollama Model

The `Modelfile` contains the system prompt and parameters for the Ollama model. You can customize this file to change the model's behavior or use a different base model.

After modifying the `Modelfile`, you might need to rebuild the model if you've changed the `FROM` line or other core parameters. Refer to the Ollama documentation for details on building custom models.

## ☕ Support

If you found this useful, consider [buying me a ko-fi](https://ko-fi.com/ewancroft)!