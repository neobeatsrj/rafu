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
const { buscarPreviewDoLink } = require("../services/linkPreview");
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
    .setDescription(rascunho.descricao);

  if (rascunho.links[0]?.url) {
    embed.setURL(rascunho.links[0].url);
  }

  if (rascunho.imagem) {
    embed.setImage(rascunho.imagem);
  }

  return embed;
}

function montarBotoesDosLinks(rascunho) {
  if (!rascunho.links.length) return null;

  const linha = new ActionRowBuilder();

  for (const link of rascunho.links) {
    let label = "Abrir link";
    let emoji = "🔗";

    if (link.provedor === "youtube") {
      label = "Assistir no YouTube";
      emoji = "▶️";
    }

    if (link.provedor === "spotify") {
      label = "Ouvir no Spotify";
      emoji = "🎧";
    }

    linha.addComponents(
      new ButtonBuilder()
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Link)
        .setURL(link.url)
    );
  }

  return linha;
}

function montarBotoesDeControle(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`anunciar:publicar:${id}`)
      .setLabel("Publicar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`anunciar:editar:${id}`)
      .setLabel("Editar título")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`anunciar:cancelar:${id}`)
      .setLabel("Cancelar")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  );
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
    .setLabel("Link principal (abre pelo título)")
    .setPlaceholder("https://...")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(1000)
    .setRequired(false);

  const linkSecundario = new TextInputBuilder()
    .setCustomId("linkSecundario")
    .setLabel("Segundo link (opcional)")
    .setPlaceholder("Spotify ou YouTube")
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
    new ActionRowBuilder().addComponents(linkSecundario),
    new ActionRowBuilder().addComponents(imagem)
  );

  return interaction.showModal(modal);
}

async function criarPrevia(interaction, tipoSelecionado) {
  const tipo = TIPOS[tipoSelecionado];
  const link = interaction.fields.getTextInputValue("link").trim();
  const linkSecundario = interaction.fields
    .getTextInputValue("linkSecundario")
    .trim();
  const imagemManual = interaction.fields.getTextInputValue("imagem").trim();

  if (
    !urlValida(link) ||
    !urlValida(linkSecundario) ||
    !urlValida(imagemManual)
  ) {
    return interaction.reply({
      content:
        "❌ O link ou a imagem não é uma URL válida. Use um endereço começando com `https://`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const [previewDoLink, previewDoLinkSecundario] = await Promise.all([
    link ? buscarPreviewDoLink(link) : null,
    linkSecundario ? buscarPreviewDoLink(linkSecundario) : null,
  ]);

  const links = [
    link
      ? {
          url: previewDoLink?.linkNormalizado || link,
          provedor: previewDoLink?.provedor || null,
        }
      : null,
    linkSecundario
      ? {
          url:
            previewDoLinkSecundario?.linkNormalizado ||
            linkSecundario,
          provedor: previewDoLinkSecundario?.provedor || null,
        }
      : null,
  ].filter(Boolean);

  const tituloDigitado = interaction.fields
    .getTextInputValue("titulo")
    .trim();
  const previewPrincipal = previewDoLink || previewDoLinkSecundario;
  const emojiDoTipo = tipo.tituloPadrao.split(" ")[0];
  const tituloFinal =
    tituloDigitado === tipo.tituloPadrao && previewPrincipal?.titulo
      ? `${emojiDoTipo} ${previewPrincipal.titulo}`
      : tituloDigitado;

  const id = randomUUID();
  const rascunho = {
    autorId: interaction.user.id,
    cor: tipo.cor,
    titulo: tituloFinal,
    descricao: interaction.fields.getTextInputValue("descricao").trim(),
    links,
    imagem:
      imagemManual ||
      previewDoLink?.thumbnailUrl ||
      previewDoLinkSecundario?.thumbnailUrl ||
      "",
  };

  rascunhos.set(id, rascunho);

  const componentes = [];
  const botoesDosLinks = montarBotoesDosLinks(rascunho);

  if (botoesDosLinks) {
    componentes.push(botoesDosLinks);
  }

  componentes.push(montarBotoesDeControle(id));

  return interaction.reply({
    content:
      previewDoLink || previewDoLinkSecundario
        ? "✅ Links reconhecidos. Confira a prévia e clique em **Publicar**."
        : "Confira a prévia abaixo. Ao clicar em **Publicar**, ela será enviada imediatamente para o canal de anúncios.",
    embeds: [montarEmbed(rascunho)],
    components: componentes,
    flags: MessageFlags.Ephemeral,
  });
}

async function abrirEdicao(interaction, id) {
  const rascunho = rascunhos.get(id);

  if (!rascunho || rascunho.autorId !== interaction.user.id) {
    return interaction.update({
      content: "❌ Esta prévia expirou. Use `/anunciar` para criar outra.",
      embeds: [],
      components: [],
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`anunciar:salvarEdicao:${id}`)
    .setTitle("Editar anúncio");

  const titulo = new TextInputBuilder()
    .setCustomId("titulo")
    .setLabel("Título do anúncio")
    .setStyle(TextInputStyle.Short)
    .setValue(rascunho.titulo)
    .setMaxLength(256)
    .setRequired(true);

  const descricao = new TextInputBuilder()
    .setCustomId("descricao")
    .setLabel("Descrição")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(rascunho.descricao)
    .setMaxLength(4000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titulo),
    new ActionRowBuilder().addComponents(descricao)
  );

  return interaction.showModal(modal);
}

async function salvarEdicao(interaction, id) {
  const rascunho = rascunhos.get(id);

  if (!rascunho || rascunho.autorId !== interaction.user.id) {
    return interaction.reply({
      content: "❌ Esta prévia expirou. Use `/anunciar` para criar outra.",
      flags: MessageFlags.Ephemeral,
    });
  }

  rascunho.titulo = interaction.fields.getTextInputValue("titulo").trim();
  rascunho.descricao = interaction.fields
    .getTextInputValue("descricao")
    .trim();

  const componentes = [];
  const botoesDosLinks = montarBotoesDosLinks(rascunho);

  if (botoesDosLinks) {
    componentes.push(botoesDosLinks);
  }

  componentes.push(montarBotoesDeControle(id));

  return interaction.update({
    content:
      "✏️ Prévia atualizada. Confira novamente antes de publicar.",
    embeds: [montarEmbed(rascunho)],
    components: componentes,
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

    const botoesDosLinks = montarBotoesDosLinks(rascunho);
    const mensagem = await canal.send({
      embeds: [montarEmbed(rascunho)],
      components: botoesDosLinks ? [botoesDosLinks] : [],
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

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("anunciar:salvarEdicao:")
  ) {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    const id = interaction.customId.split(":")[2];
    return salvarEdicao(interaction, id);
  }

  if (interaction.isButton() && interaction.customId.startsWith("anunciar:")) {
    if (!podeAnunciar(interaction)) return responderSemPermissao(interaction);

    const [, acao, id] = interaction.customId.split(":");

    if (acao === "editar") {
      return abrirEdicao(interaction, id);
    }

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
