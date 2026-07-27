const axios = require("axios");

function identificarProvedor(link) {
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, "");

    if (
      hostname === "open.spotify.com" ||
      hostname === "spotify.link"
    ) {
      return "spotify";
    }

    if (
      hostname === "youtube.com" ||
      hostname === "youtu.be" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "youtube";
    }
  } catch {
    return null;
  }

  return null;
}

async function buscarPreviewDoLink(link) {
  const provedor = identificarProvedor(link);

  if (!provedor) return null;

  try {
    const endpoint =
      provedor === "spotify"
        ? "https://open.spotify.com/oembed"
        : "https://www.youtube.com/oembed";

    const resposta = await axios.get(endpoint, {
      params:
        provedor === "spotify"
          ? { url: link }
          : { url: link, format: "json" },
      timeout: 10_000,
    });

    return {
      provedor,
      titulo: resposta.data.title || null,
      autor: resposta.data.author_name || null,
      thumbnailUrl: resposta.data.thumbnail_url || null,
    };
  } catch (erro) {
    console.warn(
      `⚠️ Não foi possível carregar a prévia do ${provedor}:`,
      erro.response?.data || erro.message
    );

    return null;
  }
}

module.exports = { buscarPreviewDoLink };
