const express = require("express");

const DEFAULT_PORT = 3100;

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paginaDoPlayer({ audio, title, author }) {
  const audioSeguro = escaparHtml(audio);
  const tituloSeguro = escaparHtml(title || "Projeto sem título");
  const autorSeguro = escaparHtml(author || "Comunidade Rafu");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${tituloSeguro} • Rafu Player</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #090a10;
      --card: #181a21;
      --player: #0d0e14;
      --border: #30323c;
      --muted: #999ca9;
      --accent: #7c68ff;
      --accent-soft: #aa9cff;
      --green: #69e6a4;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
      background:
        radial-gradient(circle at 50% 48%, rgba(82, 62, 200, .16), transparent 42%),
        var(--bg);
      color: #f7f7fb;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { width: min(1120px, 100%); }
    .card {
      padding: clamp(28px, 5vw, 52px);
      border: 1px solid var(--border);
      border-radius: 34px;
      background: linear-gradient(145deg, #1b1d24, #15171d);
      box-shadow: 0 30px 90px rgba(0, 0, 0, .48);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 38px;
      color: var(--accent-soft);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: .15em;
      text-transform: uppercase;
    }
    .status::before {
      content: "";
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 18px rgba(105, 230, 164, .65);
    }
    .info {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr);
      align-items: center;
      gap: 30px;
      margin-bottom: 38px;
    }
    .cover {
      width: 132px;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border-radius: 28px;
      background:
        radial-gradient(circle at 20% 20%, rgba(255,255,255,.16), transparent 35%),
        linear-gradient(145deg, #806aff, #2c1e91);
      color: white;
      font-size: 64px;
      font-style: italic;
      box-shadow: 0 18px 45px rgba(73, 49, 213, .32);
    }
    .eyebrow {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      overflow: hidden;
      font-size: clamp(30px, 5vw, 52px);
      font-weight: 500;
      line-height: 1.05;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .author {
      margin: 18px 0 0;
      color: #b2b4bf;
      font-size: 19px;
      font-weight: 600;
    }
    .player {
      padding: 24px 26px;
      border: 1px solid #282a33;
      border-radius: 25px;
      background: var(--player);
    }
    audio {
      display: block;
      width: 100%;
      accent-color: var(--accent);
    }
    .note {
      margin: 26px 0 0;
      color: #777a87;
      font-size: 15px;
    }
    footer {
      margin-top: 28px;
      color: #626572;
      text-align: center;
      font-size: 15px;
    }
    @media (max-width: 650px) {
      body { padding: 14px; }
      .card { border-radius: 24px; }
      .info { grid-template-columns: 82px minmax(0, 1fr); gap: 18px; }
      .cover { width: 82px; border-radius: 20px; font-size: 40px; }
      .status { margin-bottom: 26px; }
      h1 { font-size: 28px; }
      .author { font-size: 16px; }
      .player { padding: 18px; }
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="status">Prévia protegida</div>
      <div class="info">
        <div class="cover" aria-hidden="true">R</div>
        <div>
          <p class="eyebrow">Collab • Rafu</p>
          <h1 title="${tituloSeguro}">${tituloSeguro}</h1>
          <p class="author">Enviado por ${autorSeguro}</p>
        </div>
      </div>
      <div class="player">
        <audio controls controlsList="nodownload noplaybackrate" disablePictureInPicture preload="metadata">
          <source src="${audioSeguro}">
          Seu navegador não conseguiu reproduzir este áudio.
        </audio>
      </div>
      <p class="note">Sem download direto &nbsp;•&nbsp; Acesso pela Rafu</p>
    </section>
    <footer>Prévia fornecida pela Rafu</footer>
  </main>
</body>
</html>`;
}

function iniciarPlayerServer() {
  const app = express();
  const porta = Number(process.env.PLAYER_PORT || DEFAULT_PORT);

  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "rafu-player" });
  });

  app.get("/", (req, res) => {
    const audio = String(req.query.audio || "");

    if (!/^https:\/\/(cdn|media)\.discordapp\.(com|net)\//i.test(audio)) {
      return res
        .status(400)
        .type("text")
        .send("Este link de áudio não é válido.");
    }

    res
      .set("Cache-Control", "no-store")
      .set("X-Robots-Tag", "noindex, nofollow")
      .type("html")
      .send(
        paginaDoPlayer({
          audio,
          title: req.query.title,
          author: req.query.author,
        })
      );
  });

  app.listen(porta, "127.0.0.1", () => {
    console.log(`✅ Rafu Player disponível internamente na porta ${porta}.`);
  });
}

module.exports = { iniciarPlayerServer };
