const sharp = require("sharp");

function escaparXml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function limitarNome(nome, limite = 38) {
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
    <svg width="900" height="130" viewBox="0 0 900 130"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="130" rx="18" fill="#232428"/>
      <rect x="1.5" y="1.5" width="897" height="127" rx="16.5"
        fill="none" stroke="#3f4147" stroke-width="3"/>

      <path d="M38 22h54l23 23v64H38z" fill="#c9c8ff"/>
      <path d="M92 22v23h23z" fill="#9e9bf5"/>
      <path d="M53 62h12l17-13v34L65 70H53z" fill="#5865f2"/>
      <path d="M88 57c8 7 8 18 0 25" fill="none" stroke="#5865f2"
        stroke-width="5" stroke-linecap="round"/>

      <text x="145" y="61" fill="#5da8ff"
        font-family="Arial, Helvetica, sans-serif" font-size="27"
        font-weight="600">${nomeSeguro}</text>
      <text x="145" y="96" fill="#aeb1b7"
        font-family="Arial, Helvetica, sans-serif" font-size="23">
        ${tamanhoSeguro}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  gerarImagemDoArquivo,
};
