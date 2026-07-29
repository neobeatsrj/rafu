const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
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
const DESTINOS = {
  comunidade: {
    canalId: CHAT_PRODUCAO_CHANNEL_ID,
    nome: "Comunidade / procurar collab",
    emoji: "💬",
    publico: true,
  },
  vault: {
    canalId: "1531840072255799327",
    nome: "Vault do Neo Beats",
    emoji: "🔒",
  },
  the_box: {
    canalId: "1531840146692112635",
    nome: "Projetos da The Box",
    emoji: "📦",
  },
  rede: {
    canalId: "1531840177360736256",
    nome: "Rede de produtores",
    emoji: "🌟",
  },
};
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

  const destinos = new CheckboxGroupBuilder()
    .setCustomId("collab_destinos")
    .setMinValues(1)
    .setMaxValues(4)
    .addOptions(
      new CheckboxGroupOptionBuilder()
        .setLabel("Comunidade / procurar collab")
        .setDescription("Publica no chat para outros membros colaborarem.")
        .setValue("comunidade"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Vault do Neo Beats")
        .setDescription("Guarda para avaliação do Neo e oportunidades futuras.")
        .setValue("vault"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Projetos da The Box")
        .setDescription("Considera a ideia para possíveis projetos da The Box.")
        .setValue("the_box"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Rede de produtores")
        .setDescription("Autoriza apresentar a produtores selecionados.")
        .setValue("rede")
    );

  const autorizacao = new CheckboxBuilder()
    .setCustomId("collab_autorizacao")
    .setDefault(false);

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Arquivo")
      .setDescription("O nome do arquivo será usado como título.")
      .setFileUploadComponent(arquivo),
    new LabelBuilder()
      .setLabel("Onde você quer enviar?")
      .setDescription("Escolha uma ou mais opções.")
      .setCheckboxGroupComponent(destinos),
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

function montarEmbedPrivado({
  autor,
  titulo,
  arquivoNome,
  email,
  destinosSelecionados,
}) {
  const nomesDosDestinos = destinosSelecionados
    .map((destino) => {
      const dados = DESTINOS[destino];
      return `${dados.emoji} ${dados.nome}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: autor.displayName,
      iconURL: autor.displayAvatarURL(),
    })
    .setTitle(`📥 ${titulo}`)
    .setDescription(
      "Material enviado para avaliação. O autor aceitou a autorização de armazenamento e encaminhamento."
    )
    .addFields(
      {
        name: "Autor",
        value: `${autor} — ID: \`${autor.id}\``,
      },
      {
        name: "E-mail para contato",
        value: `\`${email}\``,
      },
      {
        name: "Arquivo",
        value: `\`${arquivoNome}\``,
      },
      {
        name: "Destinos autorizados",
        value: nomesDosDestinos,
      }
    );
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
    const destinosSelecionados = [
      ...interaction.fields.getCheckboxGroup("collab_destinos"),
    ].filter((destino) => DESTINOS[destino]);

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

    if (destinosSelecionados.length === 0) {
      return interaction.editReply(
        "❌ Escolha pelo menos um destino para o material."
      );
    }

    const titulo = tituloDoArquivo(arquivo.name) || "Nova ideia";
    const enviados = [];
    const falhas = [];

    for (const destinoSelecionado of destinosSelecionados) {
      const destino = DESTINOS[destinoSelecionado];

      try {
        const canal = await interaction.client.channels.fetch(destino.canalId);

        if (!canal || !canal.isTextBased()) {
          throw new Error("Canal não encontrado ou incompatível.");
        }

        if (destino.publico) {
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
            destinos: destinosSelecionados,
            autorizacaoAceitaEm: new Date().toISOString(),
          });
        } else {
          await canal.send({
            content: `Novo material enviado por ${interaction.user}.`,
            embeds: [
              montarEmbedPrivado({
                autor: interaction.user,
                titulo,
                arquivoNome: arquivo.name,
                email,
                destinosSelecionados,
              }),
            ],
            files: [{ attachment: arquivo.url, name: arquivo.name }],
          });
        }

        enviados.push(`${destino.emoji} <#${destino.canalId}>`);
      } catch (erroDoDestino) {
        console.error(
          `❌ Falha ao enviar collab para ${destino.nome}:`,
          erroDoDestino
        );
        falhas.push(`${destino.emoji} ${destino.nome}`);
      }
    }

    if (enviados.length === 0) {
      throw new Error("Nenhum dos destinos selecionados recebeu o material.");
    }

    let resposta =
      `✅ Material enviado para:\n${enviados.map((item) => `• ${item}`).join("\n")}`;

    if (falhas.length > 0) {
      resposta +=
        `\n\n⚠️ Não consegui enviar para:\n` +
        falhas.map((item) => `• ${item}`).join("\n") +
        "\nAvise a Staff para conferir as permissões desses canais.";
    }

    return interaction.editReply(resposta);
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
