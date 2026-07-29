const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "collabs.json");

let filaDeEscrita = Promise.resolve();

async function lerDados() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch (erro) {
    if (erro.code === "ENOENT") return { collabs: {} };
    throw erro;
  }
}

async function salvarDados(dados) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const temporario = `${DATA_FILE}.tmp`;
  await fs.writeFile(temporario, JSON.stringify(dados, null, 2));
  await fs.rename(temporario, DATA_FILE);
}

function alterarDados(alteracao) {
  filaDeEscrita = filaDeEscrita.then(async () => {
    const dados = await lerDados();
    const resultado = await alteracao(dados);
    await salvarDados(dados);
    return resultado;
  });

  return filaDeEscrita;
}

function registrarCollab(messageId, collab) {
  return alterarDados((dados) => {
    dados.collabs[messageId] = {
      ...collab,
      interessados: [],
    };
  });
}

function registrarInteressado(messageId, userId) {
  return alterarDados((dados) => {
    const collab = dados.collabs[messageId];
    if (!collab) return null;

    const jaRegistrado = collab.interessados.includes(userId);

    if (!jaRegistrado && userId !== collab.autorId) {
      collab.interessados.push(userId);
    }

    return {
      collab,
      jaRegistrado,
      quantidade: collab.interessados.length,
    };
  });
}

module.exports = {
  registrarCollab,
  registrarInteressado,
};
