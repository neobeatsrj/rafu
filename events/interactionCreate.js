const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const anunciarCommand = require("../commands/anunciar");
const { podeAnunciar } = require("../utils/permissions");

const TIPOS = {
  lancamento: {
    cor: 0xf1c40f,
    titulo: "💿 NOVO LANÇAMENTO",
    descricao: "Prévia de um novo single, EP ou álbum.",
  },
  video: {
    cor: 0xff0000,
    titulo: "▶️ NOVO VÍDEO",
    descricao: "Prévia de um novo vídeo.",
  },
  live: {
    cor: 0x9146ff,
    titulo: "🟣 LIVE ESPECIAL",
    descricao: "Prévia de um anúncio manual de live.",
  },
  evento: {
    cor: 0x2ecc71,
    titulo: "🎉 NOVO EVENTO",
    descricao: "Prévia de um evento da comunidade.",
  },
  comunicado: {
    cor: 0x3498db,
    titulo: "📝 COMUNICADO",
    descricao: "Prévia de um comunicado oficial.",
  },
};

async function responderSemPermissao(interaction) {
  const resposta = {
    content: "❌ Apenas administradores podem usar o sistema de anúncios.",
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(resposta);
  }

  return interaction.reply(resposta);
}

module.exports = async function interactionCreate(interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== anunciarCommand.data.name) return;
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    return anunciarCommand.execute(interaction);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "anunciar:tipo") {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    const tipoSelecionado = interaction.values[0];
    const tipo = TIPOS[tipoSelecionado];

    if (!tipo) {
      return interaction.update({
        content: "❌ Tipo de anúncio inválido.",
        embeds: [],
        components: [],
      });
    }

    const previa = new EmbedBuilder()
      .setColor(tipo.cor)
      .setTitle(tipo.titulo)
      .setDescription(
        `${tipo.descricao}\n\nNa próxima etapa, a Rafu pedirá título, descrição, link e imagem antes de publicar.`
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`anunciar:publicar:${tipoSelecionado}`)
        .setLabel("Publicar")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("anunciar:cancelar")
        .setLabel("Cancelar")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({
      content: "Esta é a prévia básica do anúncio:",
      embeds: [previa],
      components: [botoes],
    });
  }

  if (interaction.isButton() && interaction.customId.startsWith("anunciar:")) {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    if (interaction.customId === "anunciar:cancelar") {
      return interaction.update({
        content: "❌ Anúncio cancelado.",
        embeds: [],
        components: [],
      });
    }

    if (interaction.customId.startsWith("anunciar:publicar:")) {
      return interaction.update({
        content:
          "✅ Prévia aprovada. A publicação real será habilitada na próxima etapa, depois dos campos de edição.",
        embeds: interaction.message.embeds,
        components: [],
      });
    }
  }
};
