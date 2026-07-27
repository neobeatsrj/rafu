require("dotenv").config();

const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const REGRAS_CHANNEL_ID = "1529886257038098512";
const LANCAMENTOS_CHANNEL_ID = "1530310948831760384";

const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL;

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
          user_login: TWITCH_CHANNEL,
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

async function verificarTwitch() {
  try {
    const live = await consultarLive();
    const estaAoVivo = Boolean(live);

    /*
      Na primeira consulta, o bot apenas descobre o estado atual.
      Isso evita anunciar uma live antiga toda vez que a Rafu reiniciar.
    */
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
      const canal = await client.channels.fetch(LANCAMENTOS_CHANNEL_ID);

      if (!canal || !canal.isTextBased()) {
        throw new Error("O canal de lançamentos não foi encontrado.");
      }

      const thumbnail = live.thumbnail_url
        .replace("{width}", "1280")
        .replace("{height}", "720");

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle("🔴 Neo Beats está ao vivo!")
        .setURL(`https://www.twitch.tv/${TWITCH_CHANNEL}`)
        .setDescription(
          `**${live.title || "A live começou!"}**\n\nClique no título para assistir agora.`
        )
        .addFields(
          {
            name: "Categoria",
            value: live.game_name || "Sem categoria",
            inline: true,
          },
          {
            name: "Espectadores",
            value: String(live.viewer_count ?? 0),
            inline: true,
          }
        )
        .setImage(`${thumbnail}?t=${Date.now()}`)
        .setFooter({
          text: "Rafu • Assistente oficial do Neo Beats",
        })
        .setTimestamp();

      await canal.send({
        content: "@everyone",
        embeds: [embed],
      });

      console.log("🔴 Aviso de live enviado ao Discord!");
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

client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} está online!`);

  try {
    await obterTokenTwitch();
    console.log("✅ Twitch conectada!");

    await verificarTwitch();

    // Verifica a cada 5 minutos.
    setInterval(verificarTwitch, 5 * 60_000);
  } catch (erro) {
    console.error(
      "❌ Não foi possível conectar à Twitch:",
      erro.response?.data || erro.message
    );
  }
});

client.login(process.env.TOKEN);