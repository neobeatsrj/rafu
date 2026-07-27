const { randomUUID } = require("crypto");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const anunciarCommand = require("../commands/anunciar");
const { podeAnunciar } = require("../utils/permissions");

const ANUNCIOS_CHANNEL_ID = "1530310948831760384";
const rascunhos = new Map();

const TIPOS = {
  lancamento: {
    cor: 0xf1c40f,
    tituloPadrao: "💿 NOVO LANÇAMENTO",
    descricao: "Single, EP ou álbum",
  },
  video: {
    cor: 0xff0000,
    tituloPadrao: "▶️ NOVO VÍDEO",
    descricao: "Vídeo ou conteúdo novo",
  },
  live: {
    cor: 0x9146ff,
    tituloPadrao: "🟣 LIVE ESPECIAL",
    descricao: "Anúncio manual de uma live",
  },
  evento: {
    cor: 0x2ecc71,
    tituloPadrao: "🎉 NOVO EVENTO",
    descricao: "Evento, encontro ou estreia",
  },
  comunicado: {
    cor: 0x3498db,
    tituloPadrao: "📝 COMUNICADO",
    descricao: "Aviso oficial da comunidade",
  },
};

function montarEmbed(rascunho) {
  const embed = new EmbedBuilder()
    .setColor(rascunho.cor)
    .setTitle(rascunho.titulo)
    .setDescription(rascunho.descricao)
    .setTimestamp();

  if (rascunho.link) {
    embed.setURL(rascunho.link);
  }

  if (rascunho.imagem) {
    embed.setImage(rascunho.imagem);
  }

  return embed;
}

function urlValida(valor) {
  if (!valor) return true;

  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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

async function abrirFormulario(interaction, tipoSelecionado) {
  const tipo = TIPOS[tipoSelecionado];

  if (!tipo) {
    return interaction.reply({
      content: "❌ Tipo de anúncio inválido.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`anunciar:formulario:${tipoSelecionado}`)
    .setTitle("Criar anúncio");

  const titulo = new TextInputBuilder()
    .setCustomId("titulo")
    .setLabel("Título do anúncio")
    .setStyle(TextInputStyle.Short)
    .setValue(tipo.tituloPadrao)
    .setMaxLength(256)
    .setRequired(true);

  const descricao = new TextInputBuilder()
    .setCustomId("descricao")
    .setLabel("Descrição")
    .setPlaceholder("Escreva a mensagem principal do anúncio.")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(true);

  const link = new TextInputBuilder()
    .setCustomId("link")
    .setLabel("Link ao clicar no título")
    .setPlaceholder("https://...")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(1000)
    .setRequired(false);

  const imagem = new TextInputBuilder()
    .setCustomId("imagem")
    .setLabel("Link da imagem ou capa (opcional)")
    .setPlaceholder("https://...")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(1000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titulo),
    new ActionRowBuilder().addComponents(descricao),
    new ActionRowBuilder().addComponents(link),
    new ActionRowBuilder().addComponents(imagem)
  );

  return interaction.showModal(modal);
}

async function criarPrevia(interaction, tipoSelecionado) {
  const tipo = TIPOS[tipoSelecionado];
  const link = interaction.fields.getTextInputValue("link").trim();
  const imagem = interaction.fields.getTextInputValue("imagem").trim();

  if (!urlValida(link) || !urlValida(imagem)) {
    return interaction.reply({
      content:
        "❌ O link ou a imagem não é uma URL válida. Use um endereço começando com `https://`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const id = randomUUID();
  const rascunho = {
    autorId: interaction.user.id,
    cor: tipo.cor,
    titulo: interaction.fields.getTextInputValue("titulo").trim(),
    descricao: interaction.fields.getTextInputValue("descricao").trim(),
    link,
    imagem,
  };

  rascunhos.set(id, rascunho);

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`anunciar:publicar:${id}`)
      .setLabel("Publicar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`anunciar:cancelar:${id}`)
      .setLabel("Cancelar")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    content:
      "Confira a prévia abaixo. Ao clicar em **Publicar**, ela será enviada imediatamente para o canal de anúncios.",
    embeds: [montarEmbed(rascunho)],
    components: [botoes],
    flags: MessageFlags.Ephemeral,
  });
}

async function publicar(interaction, id) {
  const rascunho = rascunhos.get(id);

  if (!rascunho || rascunho.autorId !== interaction.user.id) {
    return interaction.update({
      content: "❌ Esta prévia expirou. Use `/anunciar` para criar outra.",
      embeds: [],
      components: [],
    });
  }

  await interaction.deferUpdate();

  try {
    const canal = await interaction.client.channels.fetch(
      ANUNCIOS_CHANNEL_ID
    );

    if (!canal || !canal.isTextBased()) {
      throw new Error("O canal de anúncios não foi encontrado.");
    }

    const mensagem = await canal.send({
      embeds: [montarEmbed(rascunho)],
    });

    rascunhos.delete(id);

    return interaction.editReply({
      content: `✅ Anúncio publicado em <#${ANUNCIOS_CHANNEL_ID}>.\n${mensagem.url}`,
      embeds: [],
      components: [],
    });
  } catch (erro) {
    console.error("❌ Não foi possível publicar o anúncio:", erro);

    return interaction.editReply({
      content:
        "❌ A Rafu não conseguiu publicar. Confira as permissões dela no canal de anúncios e tente novamente.",
      components: [],
    });
  }
}

module.exports = async function interactionCreate(interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== anunciarCommand.data.name) return;
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    return anunciarCommand.execute(interaction);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "anunciar:tipo") {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);
    return abrirFormulario(interaction, interaction.values[0]);
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("anunciar:formulario:")
  ) {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    const tipoSelecionado = interaction.customId.split(":")[2];
    return criarPrevia(interaction, tipoSelecionado);
  }

  if (interaction.isButton() && interaction.customId.startsWith("anunciar:")) {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    const [, acao, id] = interaction.customId.split(":");

    if (acao === "cancelar") {
      const rascunho = rascunhos.get(id);

      if (rascunho?.autorId === interaction.user.id) {
        rascunhos.delete(id);
      }

      return interaction.update({
        content: "❌ Anúncio cancelado.",
        embeds: [],
        components: [],
      });
    }

    if (acao === "publicar") {
      return publicar(interaction, id);
    }
  }
};
