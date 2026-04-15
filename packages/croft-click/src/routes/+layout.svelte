<script lang="ts">
  import './layout.css';
  let { children } = $props();
</script>

<svelte:head>
  <link
    rel="preconnect"
    href="https://fonts.googleapis.com"
  />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<header>
  <a href="/" class="brand">
    <span class="wordmark">croft.click</span>
  </a>
</header>

{@render children()}

<footer>
  <a href="https://github.com/ewanc26" target="_blank" rel="noopener">GitHub</a>
  <span class="sep">·</span>
  <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener">Support</a>
</footer>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.5rem;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    text-decoration: none;
  }
  .wordmark {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
    letter-spacing: -0.02em;
  }
  footer {
    text-align: center;
    padding: 1rem 1.5rem;
    font-size: 0.7rem;
    font-family: 'JetBrains Mono', monospace;
    color: var(--muted);
    border-top: 1px solid var(--border);
  }
  footer a {
    color: var(--accent);
    text-decoration: none;
  }
  footer a:hover {
    text-decoration: underline;
  }
  .sep {
    margin: 0 0.4rem;
    color: var(--muted);
  }
</style>
