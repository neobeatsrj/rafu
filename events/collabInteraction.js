const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  EmbedBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextDisplayBuilder,
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

function tituloDoArquivo(nome) {
  return nome
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function montarFormulario() {
  const modal = new ModalBuilder()
    .setCustomId("collab:formulario")
    .setTitle("Enviar collab");

  const arquivo = new FileUploadBuilder()
    .setCustomId("collab_arquivo")
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  const email = new TextInputBuilder()
    .setCustomId("collab_email")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("seuemail@exemplo.com")
    .setMaxLength(254)
    .setRequired(true);

  const autorizacao = new CheckboxBuilder()
    .setCustomId("collab_autorizacao")
    .setDefault(false);

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Arquivo")
      .setDescription("O nome do arquivo será usado como título.")
      .setFileUploadComponent(arquivo),
    new LabelBuilder()
      .setLabel("E-mail para contato")
      .setDescription("Usaremos somente se houver interesse no material.")
      .setTextInputComponent(email)
  );

  modal.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Autorização para avaliação e encaminhamento**\n" +
        "Confirmo que sou titular deste material ou possuo autorização para compartilhá-lo. Autorizo a Rafu e a equipe responsável pelo servidor a armazenar, organizar, reproduzir para fins de avaliação e encaminhar o arquivo exclusivamente aos destinos selecionados.\n\n" +
        "Esta autorização não transfere direitos autorais, não permite lançamento, comercialização ou uso definitivo e não garante seleção, resposta, crédito ou remuneração. Qualquer utilização será negociada e formalizada separadamente."
    )
  );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Li e aceito a autorização acima")
      .setDescription("É necessário aceitar para enviar o material.")
      .setCheckboxComponent(autorizacao)
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

function montarEmbed({ autor, titulo }) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({
      name: autor.displayName,
      iconURL: autor.displayAvatarURL(),
    })
    .setTitle(`🤝 ${titulo}`)
    .setDescription(
      "Este produtor enviou uma ideia e está aberto a novas colaborações."
    )
    .addFields({
      name: "Interessados",
      value: "0 pessoas",
      inline: true,
    });
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

    const email = interaction.fields
      .getTextInputValue("collab_email")
      .trim()
      .toLowerCase();
    const autorizou = interaction.fields.getCheckbox("collab_autorizacao");

    if (!emailValido(email)) {
      return interaction.editReply(
        "❌ Informe um endereço de e-mail válido."
      );
    }

    if (!autorizou) {
      return interaction.editReply(
        "❌ Você precisa aceitar a autorização para enviar o material."
      );
    }

    const canal = await interaction.client.channels.fetch(
      CHAT_PRODUCAO_CHANNEL_ID
    );

    if (!canal || !canal.isTextBased()) {
      throw new Error("O canal de produção não foi encontrado.");
    }

    const titulo = tituloDoArquivo(arquivo.name) || "Nova ideia";

    const mensagem = await canal.send({
      content: `${interaction.user} está procurando uma collab!`,
      embeds: [
        montarEmbed({
          autor: interaction.user,
          titulo,
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
      email,
      autorizacaoAceitaEm: new Date().toISOString(),
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
