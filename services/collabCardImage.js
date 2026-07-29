const sharp = require("sharp");

function escaparXml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function limitarNome(nome, limite = 54) {
  if (nome.length <= limite) return nome;

  const ultimoPonto = nome.lastIndexOf(".");
  const extensao = ultimoPonto > 0 ? nome.slice(ultimoPonto) : "";
  const espacoDisponivel = Math.max(12, limite - extensao.length - 1);

  return `${nome.slice(0, espacoDisponivel)}…${extensao}`;
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
    <svg width="900" height="180" viewBox="0 0 900 180"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="180" rx="24" fill="#232428"/>
      <rect x="1.5" y="1.5" width="897" height="177" rx="22.5"
        fill="none" stroke="#3f4147" stroke-width="3"/>

      <path d="M48 32h72l32 32v84H48z" fill="#c9c8ff"/>
      <path d="M120 32v32h32z" fill="#9e9bf5"/>
      <circle cx="90" cy="105" r="23" fill="#5865f2"/>
      <path d="M78 99h9l13-10v32l-13-10h-9z" fill="#ffffff"/>
      <path d="M106 96c7 6 7 13 0 19" fill="none" stroke="#ffffff"
        stroke-width="5" stroke-linecap="round"/>

      <text x="184" y="83" fill="#5da8ff"
        font-family="Arial, Helvetica, sans-serif" font-size="35"
        font-weight="600">${nomeSeguro}</text>
      <text x="184" y="127" fill="#aeb1b7"
        font-family="Arial, Helvetica, sans-serif" font-size="27">
        ${tamanhoSeguro}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  gerarImagemDoArquivo,
};
