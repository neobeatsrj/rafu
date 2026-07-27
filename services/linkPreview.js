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

function extrairVideoIdDoYouTube(link) {
  try {
    const url = new URL(link);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const partes = url.pathname.split("/").filter(Boolean);

      if (["shorts", "embed", "live"].includes(partes[0])) {
        return partes[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function buscarPreviewDoLink(link) {
  const provedor = identificarProvedor(link);

  if (!provedor) return null;

  let dados = {};

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

    dados = resposta.data;
  } catch (erro) {
    console.warn(
      `⚠️ Não foi possível carregar a prévia do ${provedor}:`,
      erro.response?.data || erro.message
    );
  }

  let thumbnailUrl = dados.thumbnail_url || null;
  let linkNormalizado = link;

  if (provedor === "youtube") {
    const videoId = extrairVideoIdDoYouTube(link);

    if (videoId) {
      linkNormalizado = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailRetangular = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      try {
        await axios.head(thumbnailRetangular, { timeout: 5_000 });
        thumbnailUrl = thumbnailRetangular;
      } catch {
        /*
          Nem todo vídeo tem maxresdefault. Nesse caso, preservamos
          a thumbnail oficial retornada pelo YouTube oEmbed.
        */
        thumbnailUrl =
          thumbnailUrl ||
          `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
  }

  return {
    provedor,
    titulo: dados.title || null,
    autor: dados.author_name || null,
    thumbnailUrl,
    linkNormalizado,
  };
}

module.exports = { buscarPreviewDoLink };
