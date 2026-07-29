const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const {
  registrarCollab,
  registrarInteressado,
} = require("../services/collabStore");

const CHAT_PRODUCAO_CHANNEL_ID = "1531680489579217026";
const EXTENSOES_PERMITIDAS = new Set([
  "aif",
  "aiff",
  "als",
  "flac",
  "flp",
  "logicx",
  "m4a",
  "mid",
  "midi",
  "mp3",
  "ogg",
  "rar",
  "wav",
  "zip",
]);

function extensaoDoArquivo(nome) {
  return nome.toLowerCase().split(".").pop();
}

function montarFormulario() {
  const modal = new ModalBuilder()
    .setCustomId("collab:formulario")
    .setTitle("Enviar collab");

  const titulo = new TextInputBuilder()
    .setCustomId("collab_titulo")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex.: Beat de trap melódico")
    .setMaxLength(100)
    .setRequired(true);

  const descricao = new TextInputBuilder()
    .setCustomId("collab_descricao")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Conte sobre a ideia e o que já foi feito.")
    .setMaxLength(1000)
    .setRequired(true);

  const procurando = new TextInputBuilder()
    .setCustomId("collab_procurando")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Produtor, MC ou alguém para finalizar")
    .setMaxLength(100)
    .setRequired(true);

  const detalhes = new TextInputBuilder()
    .setCustomId("collab_detalhes")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex.: 140 BPM • Fá menor")
    .setMaxLength(100)
    .setRequired(false);

  const arquivo = new FileUploadBuilder()
    .setCustomId("collab_arquivo")
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Título")
      .setDescription("Dê um nome curto para sua ideia.")
      .setTextInputComponent(titulo),
    new LabelBuilder()
      .setLabel("Descrição")
      .setDescription("Explique rapidamente o projeto.")
      .setTextInputComponent(descricao),
    new LabelBuilder()
      .setLabel("O que você procura?")
      .setDescription("Produtor, MC ou ajuda para finalizar.")
      .setTextInputComponent(procurando),
    new LabelBuilder()
      .setLabel("BPM e tom (opcional)")
      .setDescription("Preencha se souber.")
      .setTextInputComponent(detalhes),
    new LabelBuilder()
      .setLabel("Arquivo")
      .setDescription("Áudio, MIDI, projeto ou arquivo compactado.")
      .setFileUploadComponent(arquivo)
  );

  return modal;
}

function montarBotaoDeInteresse(messageId, quantidade) {
  const label =
    quantidade === 0
      ? "Quero colaborar"
      : `Quero colaborar • ${quantidade}`;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`collab:interesse:${messageId}`)
      .setLabel(label)
      .setEmoji("🤝")
      .setStyle(ButtonStyle.Success)
  );
}

function montarEmbed({ autor, titulo, descricao, procurando, detalhes }) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({
      name: autor.displayName,
      iconURL: autor.displayAvatarURL(),
    })
    .setTitle(`🤝 ${titulo}`)
    .setDescription(descricao)
    .addFields({
      name: "Procuro",
      value: procurando,
      inline: true,
    });

  if (detalhes) {
    embed.addFields({
      name: "BPM / Tom",
      value: detalhes,
      inline: true,
    });
  }

  embed.addFields({
    name: "Interessados",
    value: "0 pessoas",
    inline: true,
  });

  return embed;
}

async function abrirFormulario(interaction) {
  return interaction.showModal(montarFormulario());
}

async function publicarCollab(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const arquivos = interaction.fields.getUploadedFiles(
      "collab_arquivo",
      true
    );
    const arquivo = arquivos.first();

    if (!arquivo || !EXTENSOES_PERMITIDAS.has(extensaoDoArquivo(arquivo.name))) {
      return interaction.editReply(
        "❌ Envie um arquivo de áudio, MIDI, projeto musical ou ZIP/RAR."
      );
    }

    const canal = await interaction.client.channels.fetch(
      CHAT_PRODUCAO_CHANNEL_ID
    );

    if (!canal || !canal.isTextBased()) {
      throw new Error("O canal de produção não foi encontrado.");
    }

    const titulo = interaction.fields
      .getTextInputValue("collab_titulo")
      .trim();
    const descricao = interaction.fields
      .getTextInputValue("collab_descricao")
      .trim();
    const procurando = interaction.fields
      .getTextInputValue("collab_procurando")
      .trim();
    const detalhes = interaction.fields
      .getTextInputValue("collab_detalhes")
      .trim();

    const mensagem = await canal.send({
      content: `${interaction.user} está procurando uma collab!`,
      embeds: [
        montarEmbed({
          autor: interaction.user,
          titulo,
          descricao,
          procurando,
          detalhes,
        }),
      ],
      files: [{ attachment: arquivo.url, name: arquivo.name }],
    });

    await mensagem.edit({
      components: [montarBotaoDeInteresse(mensagem.id, 0)],
    });

    await registrarCollab(mensagem.id, {
      autorId: interaction.user.id,
      canalId: canal.id,
      arquivoNome: arquivo.name,
    });

    return interaction.editReply(
      `✅ Sua collab foi publicada em <#${CHAT_PRODUCAO_CHANNEL_ID}>.\n${mensagem.url}`
    );
  } catch (erro) {
    console.error("❌ Não foi possível publicar a collab:", erro);

    return interaction.editReply(
      "❌ Não consegui publicar sua collab. Tente novamente ou avise a Staff."
    );
  }
}

async function demonstrarInteresse(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const messageId = interaction.customId.split(":")[2];
    const resultado = await registrarInteressado(
      messageId,
      interaction.user.id
    );

    if (!resultado) {
      return interaction.editReply(
        "❌ Esta collab não está mais disponível."
      );
    }

    if (interaction.user.id === resultado.collab.autorId) {
      return interaction.editReply(
        "ℹ️ Você é o autor desta collab e já possui o arquivo."
      );
    }

    const mensagem = interaction.message;
    const arquivo = mensagem.attachments.first();
    const embed = EmbedBuilder.from(mensagem.embeds[0]);

    embed.spliceFields(
      embed.data.fields.length - 1,
      1,
      {
        name: "Interessados",
        value: `${resultado.quantidade} ${
          resultado.quantidade === 1 ? "pessoa" : "pessoas"
        }`,
        inline: true,
      }
    );

    await mensagem.edit({
      embeds: [embed],
      components: [
        montarBotaoDeInteresse(messageId, resultado.quantidade),
      ],
    });

    const botaoDoArquivo = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Baixar arquivo")
        .setEmoji("📥")
        .setStyle(ButtonStyle.Link)
        .setURL(arquivo.url)
    );

    const aviso = resultado.jaRegistrado
      ? "Você já estava na lista. Aqui está o arquivo novamente:"
      : "Interesse registrado! Aqui está o arquivo:";

    return interaction.editReply({
      content: `${aviso}\n\nSe a ideia avançar, marque ${`<@${resultado.collab.autorId}>`} no chat.`,
      components: [botaoDoArquivo],
    });
  } catch (erro) {
    console.error("❌ Não foi possível registrar o interesse:", erro);

    return interaction.editReply(
      "❌ Não consegui liberar o arquivo agora. Tente novamente."
    );
  }
}

module.exports = async function collabInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === "collab:abrir") {
    await abrirFormulario(interaction);
    return true;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "collab:formulario"
  ) {
    await publicarCollab(interaction);
    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("collab:interesse:")
  ) {
    await demonstrarInteresse(interaction);
    return true;
  }

  return false;
};
