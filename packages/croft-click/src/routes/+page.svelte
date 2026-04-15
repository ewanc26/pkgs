<script lang="ts">
  import { Music2, Camera, FileText, GitBranch, ArrowRight, ExternalLink, Github } from '@lucide/svelte';
</script>

<svelte:head>
  <title>croft.click — Developer tools & utilities</title>
  <meta name="description" content="A collection of open-source developer tools and utilities by Ewan Croft." />
  <link rel="canonical" href="https://croft.click" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://croft.click" />
  <meta property="og:title" content="croft.click — Developer tools & utilities" />
  <meta property="og:description" content="A collection of open-source developer tools and utilities by Ewan Croft." />

  <!-- Twitter / X card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="croft.click — Developer tools & utilities" />
  <meta name="twitter:description" content="A collection of open-source developer tools and utilities by Ewan Croft." />
</svelte:head>

<main>
  <!-- ── Hero ───────────────────────────────────────────────────────────────── -->
  <section class="hero">
    <p class="wordmark">croft.click</p>
    <p class="eyebrow">Developer tools & utilities</p>
    <h1>A collection of open-source projects for the web.</h1>
    <p class="sub">
      Built to solve real problems — from importing your music history to
      preserving your photos. Free, privacy-first, and open source.
    </p>
  </section>

  <!-- ── Projects ───────────────────────────────────────────────────────────── -->
  <section class="projects">
    <h2>Projects</h2>
    <div class="project-grid">
      <a href="https://malachite.croft.click" class="project-card">
        <span class="project-icon"><Music2 size={24} /></span>
        <div class="project-content">
          <h3>Malachite <ExternalLink size={14} /></h3>
          <p>Import your Last.fm and Spotify listening history to Teal.</p>
        </div>
      </a>

      <a href="https://jasper.croft.click" class="project-card">
        <span class="project-icon"><Camera size={24} /></span>
        <div class="project-content">
          <h3>Jasper <ExternalLink size={14} /></h3>
          <p>Import your Instagram photos to Grain.social.</p>
        </div>
      </a>

      <a href="https://docs.ewancroft.uk" class="project-card">
        <span class="project-icon"><FileText size={24} /></span>
        <div class="project-content">
          <h3>Documentation <ExternalLink size={14} /></h3>
          <p>Guides, references, and project documentation.</p>
        </div>
      </a>

      <a href="https://git.ewancroft.uk" class="project-card">
        <span class="project-icon"><GitBranch size={24} /></span>
        <div class="project-content">
          <h3>Git Forge <ExternalLink size={14} /></h3>
          <p>Source code and repositories.</p>
        </div>
      </a>
    </div>
  </section>

  <!-- ── CTA ────────────────────────────────────────────────────────────────── -->
  <section class="cta">
    <h2>Open source</h2>
    <p>All projects are free to use and open source. Built with care.</p>
    <a href="https://github.com/ewanc26" target="_blank" rel="noopener" class="btn-ghost">
      <Github size={15} /> View on GitHub
    </a>
  </section>

  <footer>
    <span>Built by Ewan Croft</span>
    <span class="sep">·</span>
    <a href="https://github.com/ewanc26" target="_blank" rel="noopener">GitHub</a>
    <span class="sep">·</span>
    <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener">Support</a>
  </footer>
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 4rem 1.5rem 5rem;
  }

  /* ── Hero ─────────────────────────────────────────────────────────────────── */
  .hero {
    text-align: center;
    padding: 3rem 0 3.5rem;
  }

  .wordmark {
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
    margin: 0 0 0.5rem;
  }

  .eyebrow {
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 1.25rem;
  }

  h1 {
    font-size: clamp(1.65rem, 4vw, 2.5rem);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.03em;
    color: var(--text);
    margin: 0 0 1.25rem;
  }

  .sub {
    font-size: 1.05rem;
    color: var(--muted);
    line-height: 1.6;
    max-width: 480px;
    margin: 0 auto 2.25rem;
  }

  /* ── Projects ─────────────────────────────────────────────────────────────── */
  .projects {
    margin-bottom: 4rem;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--text);
    margin: 0 0 1.5rem;
    letter-spacing: -0.02em;
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .project-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.25rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    text-decoration: none;
    transition: border-color 0.15s, transform 0.1s;
  }

  .project-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    text-decoration: none;
  }

  .project-icon {
    color: var(--accent);
    display: flex;
    flex-shrink: 0;
  }

  .project-content {
    flex: 1;
    min-width: 0;
  }

  .project-content h3 {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text);
    margin: 0 0 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .project-content p {
    font-size: 0.8rem;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  /* ── CTA ──────────────────────────────────────────────────────────────────── */
  .cta {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2.5rem;
    text-align: center;
    margin-bottom: 3rem;
  }

  .cta h2 { margin-bottom: 0.5rem; }

  .cta p {
    font-size: 0.875rem;
    color: var(--muted);
    margin: 0 0 1.75rem;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--surface);
    color: var(--muted);
    font-size: 0.875rem;
    padding: 0.65rem 1.125rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-ghost:hover { border-color: var(--accent); color: var(--text); text-decoration: none; }

  /* ── Footer ───────────────────────────────────────────────────────────────── */
  footer {
    text-align: center;
    font-size: 0.78rem;
    color: var(--muted);
  }

  footer a { color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }
  footer a:hover { color: var(--accent); }
  .sep { margin: 0 0.4rem; }

  /* ── Responsive ───────────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .hero { padding: 1.5rem 0 2.5rem; }
    .project-grid { grid-template-columns: 1fr; }
    .cta { padding: 1.75rem 1.25rem; }
  }
</style>
