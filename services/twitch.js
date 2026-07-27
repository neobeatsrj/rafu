const axios = require("axios");
const { EmbedBuilder } = require("discord.js");

const ANUNCIOS_CHANNEL_ID = "1530310948831760384";
const INTERVALO_TWITCH_MS = 5 * 60_000;

let twitchAccessToken = null;
let estavaAoVivo = false;
let primeiraVerificacao = true;

async function obterTokenTwitch() {
  const resposta = await axios.post(
    "https://id.twitch.tv/oauth2/token",
    null,
    {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      },
    }
  );

  twitchAccessToken = resposta.data.access_token;
}

async function consultarLive() {
  if (!twitchAccessToken) {
    await obterTokenTwitch();
  }

  try {
    const resposta = await axios.get(
      "https://api.twitch.tv/helix/streams",
      {
        params: {
          user_login: process.env.TWITCH_CHANNEL,
        },
        headers: {
          "Client-ID": process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${twitchAccessToken}`,
        },
      }
    );

    return resposta.data.data[0] || null;
  } catch (erro) {
    if (erro.response?.status === 401) {
      console.log("🔄 Token da Twitch expirou. Gerando outro...");
      await obterTokenTwitch();
      return consultarLive();
    }

    throw erro;
  }
}

async function verificarTwitch(client) {
  try {
    const live = await consultarLive();
    const estaAoVivo = Boolean(live);

    if (primeiraVerificacao) {
      estavaAoVivo = estaAoVivo;
      primeiraVerificacao = false;

      console.log(
        estaAoVivo
          ? "🟣 Twitch verificada: Neo Beats já está ao vivo."
          : "⚫ Twitch verificada: Neo Beats está offline."
      );

      return;
    }

    if (estaAoVivo && !estavaAoVivo) {
      const canal = await client.channels.fetch(ANUNCIOS_CHANNEL_ID);

      if (!canal || !canal.isTextBased()) {
        throw new Error("O canal de anúncios não foi encontrado.");
      }

      const thumbnail = live.thumbnail_url
        .replace("{width}", "1280")
        .replace("{height}", "720");

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("🟣 Neo Beats está AO VIVO!")
        .setURL(`https://www.twitch.tv/${process.env.TWITCH_CHANNEL}`)
        .setDescription(`**${live.title || "A live começou!"}**`)
        .setImage(`${thumbnail}?t=${Date.now()}`)
        .setTimestamp();

      await canal.send({ embeds: [embed] });
      console.log("🟣 Aviso de live enviado ao Discord!");
    }

    if (!estaAoVivo && estavaAoVivo) {
      console.log("⚫ A live terminou.");
    }

    estavaAoVivo = estaAoVivo;
  } catch (erro) {
    console.error(
      "❌ Erro ao verificar a Twitch:",
      erro.response?.data || erro.message
    );
  }
}

async function iniciarMonitoramentoTwitch(client) {
  try {
    await obterTokenTwitch();
    console.log("✅ Twitch conectada!");

    await verificarTwitch(client);
    setInterval(() => verificarTwitch(client), INTERVALO_TWITCH_MS);
  } catch (erro) {
    console.error(
      "❌ Não foi possível conectar à Twitch:",
      erro.response?.data || erro.message
    );
  }
}

module.exports = {
  iniciarMonitoramentoTwitch,
  verificarTwitch,
};
