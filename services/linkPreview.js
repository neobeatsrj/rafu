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

    const videoId =
      provedor === "youtube" ? extrairVideoIdDoYouTube(link) : null;

    return {
      provedor,
      titulo: resposta.data.title || null,
      autor: resposta.data.author_name || null,
      thumbnailUrl:
        videoId
          ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          : resposta.data.thumbnail_url || null,
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
