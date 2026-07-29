const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  ContainerBuilder,
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
const RASCUNHO_DURACAO_MS = 30 * 60 * 1000;
const PLAYER_BASE_URL = "https://rafu-player-preview.neobeats.chatgpt.site";
const rascunhos = new Map();

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

function obterRascunho(userId) {
  const rascunho = rascunhos.get(userId);

  if (!rascunho) return null;

  if (Date.now() - rascunho.criadoEm > RASCUNHO_DURACAO_MS) {
    rascunhos.delete(userId);
    return null;
  }

  return rascunho;
}

function montarFormularioMaterial() {
  const modal = new ModalBuilder()
    .setCustomId("collab:material")
    .setTitle("Enviar collab • 1/2");

  const arquivo = new FileUploadBuilder()
    .setCustomId("collab_arquivo")
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  const destinos = new CheckboxGroupBuilder()
    .setCustomId("collab_destinos")
    .setMinValues(1)
    .setMaxValues(4)
    .addOptions(
      new CheckboxGroupOptionBuilder()
        .setLabel("Encontrar uma collab")
        .setDescription("Compartilho com a comunidade para criarem juntos.")
        .setValue("comunidade"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Vault do Neo Beats")
        .setDescription("Envio para a seleção do Neo e futuras oportunidades.")
        .setValue("vault"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Projetos da The Box")
        .setDescription("Coloco para avaliação em projetos da The Box.")
        .setValue("the_box"),
      new CheckboxGroupOptionBuilder()
        .setLabel("Conexões da indústria")
        .setDescription("Posso apresentar a profissionais selecionados.")
        .setValue("rede")
    );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Arquivo")
      .setDescription("O nome do arquivo será usado como título.")
      .setFileUploadComponent(arquivo),
    new LabelBuilder()
      .setLabel("Onde sua ideia pode chegar?")
      .setDescription("Escolha um ou mais caminhos.")
      .setCheckboxGroupComponent(destinos)
  );

  return modal;
}

function montarFormularioAutorizacao() {
  const modal = new ModalBuilder()
    .setCustomId("collab:autorizacao")
    .setTitle("Enviar collab • 2/2");

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
      .setLabel("E-mail para contato")
      .setDescription("Usaremos somente se houver interesse no material.")
      .setTextInputComponent(email)
  );

  modal.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Autorização para avaliação e encaminhamento**\n" +
        "Confirmo que sou titular deste material ou possuo autorização para compartilhá-lo. Autorizo a Rafu e a equipe responsável pelo servidor a armazenar, organizar, reproduzir para fins de avaliação e encaminhar o arquivo exclusivamente aos destinos selecionados.\n\n" +
        "Esta autorização não transfere direitos autorais, não permite lançamento, comercialização ou uso definitivo e não garante seleção, resposta, crédito ou remuneração. Caso exista interesse, qualquer utilização será negociada e formalizada separadamente por meio do e-mail informado acima."
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

function montarFormularioTitulo(tituloAtual) {
  const modal = new ModalBuilder()
    .setCustomId("collab:titulo")
    .setTitle("Editar título");

  const titulo = new TextInputBuilder()
    .setCustomId("collab_titulo")
    .setLabel("Título da collab")
    .setStyle(TextInputStyle.Short)
    .setValue(tituloAtual)
    .setPlaceholder("Dê um nome curto para sua ideia")
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titulo)
  );

  return modal;
}

function montarResumoDoMaterial(rascunho) {
  const nomesDosDestinos = rascunho.destinosSelecionados
    .map((destino) => {
      const dados = DESTINOS[destino];
      return `• ${dados.emoji} ${dados.nome}`;
    })
    .join("\n");

  const editarTitulo = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("collab:editar-titulo")
      .setLabel("Editar título")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary)
  );

  const continuarEnvio = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("collab:continuar")
      .setLabel("Continuar envio")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Success)
  );

  return {
    components: [
      new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🎵 Título da collab\n` +
              `> ## ${rascunho.titulo}`
          )
        )
        .addActionRowComponents(editarTitulo)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Arquivo: \`${rascunho.arquivo.name}\`\n\n` +
              `**Destinos escolhidos:**\n${nomesDosDestinos}\n\n` +
              "Depois, informe seu contato e aceite a autorização."
          )
        )
        .addActionRowComponents(continuarEnvio),
    ],
  };
}

function montarBotoesDaCollab(messageId, quantidade, playerUrl) {
  const label =
    quantidade === 0
      ? "Quero colaborar"
      : `Quero colaborar • ${quantidade}`;

  const botoes = [];

  if (playerUrl) {
    botoes.push(
      new ButtonBuilder()
        .setLabel("Ouvir prévia")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Link)
        .setURL(playerUrl)
    );
  }

  botoes.push(
    new ButtonBuilder()
        .setCustomId(`collab:interesse:${messageId}`)
        .setLabel(label)
        .setEmoji("🤝")
        .setStyle(ButtonStyle.Success)
  );

  return new ActionRowBuilder().addComponents(botoes);
}

function montarCollabPublica({
  autor,
  titulo,
  arquivoNome,
  messageId,
  quantidade,
  playerUrl,
}) {
  return new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 🤝 ${titulo}\n` +
          `Enviado por ${autor}\n\n` +
          "Este produtor está aberto a novas colaborações.\n" +
          `**${quantidade} ${
            quantidade === 1
              ? "pessoa quer colaborar"
              : "pessoas querem colaborar"
          }**`
      )
    )
    .addActionRowComponents(
      montarBotoesDaCollab(messageId, quantidade, playerUrl)
    );
}

function montarPlayerUrl({ arquivoUrl, titulo, autor }) {
  const url = new URL(PLAYER_BASE_URL);
  url.searchParams.set("audio", arquivoUrl);
  url.searchParams.set("title", titulo);
  url.searchParams.set("author", autor);
  return url.toString();
}

function encontrarArquivoNaMensagem(mensagem) {
  const anexo = mensagem.attachments.first();
  if (anexo?.url) return anexo.url;

  const procurar = (componentes = []) => {
    for (const componente of componentes) {
      if (componente?.file?.url) return componente.file.url;
      const encontrado = procurar(componente?.components);
      if (encontrado) return encontrado;
    }
    return null;
  };

  return procurar(mensagem.components);
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
  return interaction.showModal(montarFormularioMaterial());
}

async function prepararCollab(interaction) {
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

    const destinosSelecionados = [
      ...interaction.fields.getCheckboxGroup("collab_destinos"),
    ].filter((destino) => DESTINOS[destino]);

    if (destinosSelecionados.length === 0) {
      return interaction.editReply(
        "❌ Escolha pelo menos um destino para o material."
      );
    }

    const respostaArquivo = await fetch(arquivo.url);

    if (!respostaArquivo.ok) {
      throw new Error(
        `Não foi possível guardar o arquivo temporário: HTTP ${respostaArquivo.status}`
      );
    }

    const arquivoBuffer = Buffer.from(
      await respostaArquivo.arrayBuffer()
    );

    const rascunho = {
      arquivo: {
        name: arquivo.name,
        buffer: arquivoBuffer,
      },
      titulo: tituloDoArquivo(arquivo.name) || "Nova ideia",
      destinosSelecionados,
      criadoEm: Date.now(),
    };

    rascunhos.set(interaction.user.id, rascunho);
    await interaction.deleteReply();

    return interaction.followUp({
      ...montarResumoDoMaterial(rascunho),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  } catch (erro) {
    console.error("❌ Não foi possível preparar a collab:", erro);

    return interaction.editReply(
      "❌ Não consegui preparar seu material. Tente novamente ou avise a Staff."
    );
  }
}

async function abrirEditorTitulo(interaction) {
  const rascunho = obterRascunho(interaction.user.id);

  if (!rascunho) {
    return interaction.reply({
      content:
        "⌛ Este envio expirou. Clique novamente em **Enviar minha collab**.",
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.showModal(montarFormularioTitulo(rascunho.titulo));
}

async function salvarTitulo(interaction) {
  const rascunho = obterRascunho(interaction.user.id);

  if (!rascunho) {
    return interaction.reply({
      content:
        "⌛ Este envio expirou. Clique novamente em **Enviar minha collab**.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const titulo = interaction.fields
    .getTextInputValue("collab_titulo")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);

  if (!titulo) {
    return interaction.reply({
      content: "❌ O título não pode ficar vazio.",
      flags: MessageFlags.Ephemeral,
    });
  }

  rascunho.titulo = titulo;
  return interaction.update(montarResumoDoMaterial(rascunho));
}

async function abrirFormularioAutorizacao(interaction) {
  if (!obterRascunho(interaction.user.id)) {
    return interaction.reply({
      content:
        "⌛ Este envio expirou. Clique novamente em **Enviar minha collab**.",
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.showModal(montarFormularioAutorizacao());
}

async function publicarCollab(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const rascunho = obterRascunho(interaction.user.id);

    if (!rascunho) {
      return interaction.editReply(
        "⌛ Este envio expirou. Clique novamente em **Enviar minha collab**."
      );
    }

    const { arquivo, destinosSelecionados } = rascunho;
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

    const titulo =
      rascunho.titulo || tituloDoArquivo(arquivo.name) || "Nova ideia";
    const enviados = [];
    const falhas = [];
    let arquivoPublicoUrl = null;
    let playerUrl = null;

    if (destinosSelecionados.includes("comunidade")) {
      const canalDeArmazenamento = await interaction.client.channels.fetch(
        DESTINOS.vault.canalId
      );

      if (!canalDeArmazenamento || !canalDeArmazenamento.isTextBased()) {
        throw new Error("Canal privado de armazenamento não encontrado.");
      }

      const mensagemDeArmazenamento = await canalDeArmazenamento.send({
        content: `🔐 Arquivo da collab pública enviado por ${interaction.user}.`,
        files: [{ attachment: arquivo.buffer, name: arquivo.name }],
      });

      arquivoPublicoUrl = mensagemDeArmazenamento.attachments.first()?.url;

      if (!arquivoPublicoUrl) {
        throw new Error("Não foi possível obter o endereço privado do arquivo.");
      }

      playerUrl = montarPlayerUrl({
        arquivoUrl: arquivoPublicoUrl,
        titulo,
        autor: interaction.user.displayName || interaction.user.username,
      });

      if (playerUrl.length > 512) {
        throw new Error(
          "O endereço da prévia ultrapassou o limite permitido pelo Discord."
        );
      }
    }

    for (const destinoSelecionado of destinosSelecionados) {
      const destino = DESTINOS[destinoSelecionado];

      try {
        const canal = await interaction.client.channels.fetch(destino.canalId);

        if (!canal || !canal.isTextBased()) {
          throw new Error("Canal não encontrado ou incompatível.");
        }

        if (destino.publico) {
          const mensagem = await canal.send({
            components: [
              montarCollabPublica({
                autor: interaction.user,
                titulo,
                arquivoNome: arquivo.name,
                messageId: "pendente",
                quantidade: 0,
                playerUrl,
              }),
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          await mensagem.edit({
            components: [
              montarCollabPublica({
                autor: interaction.user,
                titulo,
                arquivoNome: arquivo.name,
                messageId: mensagem.id,
                quantidade: 0,
                playerUrl,
              }),
            ],
          });

          await registrarCollab(mensagem.id, {
            autorId: interaction.user.id,
            canalId: canal.id,
            arquivoNome: arquivo.name,
            titulo,
            email,
            arquivoUrl: arquivoPublicoUrl,
            playerUrl,
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
            files: [{ attachment: arquivo.buffer, name: arquivo.name }],
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

    rascunhos.delete(interaction.user.id);
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
    const arquivoUrl =
      resultado.collab.arquivoUrl || encontrarArquivoNaMensagem(mensagem);

    if (mensagem.embeds.length > 0) {
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
          montarBotoesDaCollab(
            messageId,
            resultado.quantidade,
            resultado.collab.playerUrl
          ),
        ],
      });
    } else {
      const autor = await interaction.client.users.fetch(
        resultado.collab.autorId
      );

      await mensagem.edit({
        components: [
          montarCollabPublica({
            autor,
            titulo:
              resultado.collab.titulo ||
              tituloDoArquivo(resultado.collab.arquivoNome) ||
              "Nova ideia",
            arquivoNome: resultado.collab.arquivoNome,
            messageId,
            quantidade: resultado.quantidade,
            playerUrl: resultado.collab.playerUrl,
          }),
        ],
      });
    }

    if (!arquivoUrl) {
      throw new Error("Arquivo da collab não foi localizado.");
    }

    const botaoDoArquivo = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Baixar arquivo")
        .setEmoji("📥")
        .setStyle(ButtonStyle.Link)
        .setURL(arquivoUrl)
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
    interaction.customId === "collab:material"
  ) {
    await prepararCollab(interaction);
    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "collab:editar-titulo"
  ) {
    await abrirEditorTitulo(interaction);
    return true;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "collab:titulo"
  ) {
    await salvarTitulo(interaction);
    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "collab:continuar"
  ) {
    await abrirFormularioAutorizacao(interaction);
    return true;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "collab:autorizacao"
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
