const sharp = require("sharp");

function escaparXml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function limitarNome(nome, limite = 34) {
  if (nome.length <= limite) return nome;

  const ultimoPonto = nome.lastIndexOf(".");
  const extensao = ultimoPonto > 0 ? nome.slice(ultimoPonto) : "";
  const espacoDisponivel = Math.max(12, limite - extensao.length - 1);
  const inicio = nome
    .slice(0, espacoDisponivel)
    .replace(/[._\-\s]+$/g, "");

  return `${inicio}…${extensao}`;
}

function formatarTamanho(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Arquivo de áudio";

  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1
  );
  const valor = bytes / 1024 ** indice;

  return `${valor >= 10 || indice === 0 ? valor.toFixed(0) : valor.toFixed(2)} ${
    unidades[indice]
  }`;
}

async function gerarImagemDoArquivo({ nome, tamanho }) {
  const nomeSeguro = escaparXml(limitarNome(nome));
  const tamanhoSeguro = escaparXml(formatarTamanho(tamanho));

  const svg = `
    <svg width="720" height="112" viewBox="0 0 720 112"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="112" rx="12" fill="#232428"/>
      <rect x="1" y="1" width="718" height="110" rx="11"
        fill="none" stroke="#3f4147" stroke-width="2"/>

      <g transform="translate(28 20)">
        <path d="M0 0h38l18 18v54H0z" fill="#c9c8ff"/>
        <path d="M38 0v18h18z" fill="#a7a5f5"/>
        <path d="M12 31h7l11-8v26l-11-8h-7z" fill="#5865f2"/>
        <path d="M35 29c5 4 5 13 0 17" fill="none" stroke="#5865f2"
          stroke-width="3.5" stroke-linecap="round"/>
      </g>

      <text x="108" y="49" fill="#5da8ff"
        font-family="Arial, Helvetica, sans-serif" font-size="24"
        font-weight="600">${nomeSeguro}</text>
      <text x="108" y="79" fill="#aeb1b7"
        font-family="Arial, Helvetica, sans-serif" font-size="19">
        ${tamanhoSeguro}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  gerarImagemDoArquivo,
};
