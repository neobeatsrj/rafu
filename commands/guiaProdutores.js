const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const PRODUTORES_CHANNEL_ID = "1531679868268576868";
const INICIO_DA_MENSAGEM = "🎹 **Bem-vindo à área de Produtores!**";

const MENSAGEM = `${INICIO_DA_MENSAGEM}

Se você produz música, este é o espaço para aprender, compartilhar conhecimento e conhecer outros produtores.

💬 **Chat de Produção**

Converse sobre produção musical, compartilhe beats, samples, projetos, peça feedback, tire dúvidas sobre plugins, DAWs, mixagem e troque ideias com a comunidade.

🤝 **Collabs**

Quer produzir com alguém? Está procurando um cantor ou outro produtor para colaborar na sua música? Publique sua ideia aqui e encontre pessoas para criar juntos.

🔒 **Secret Folders**

Se você possui o Secret Folders, este é o seu espaço exclusivo. Aqui você receberá todas as atualizações do pack, novidades e conteúdos extras conforme forem sendo lançados.

🎵 A melhor forma de crescer como produtor é compartilhando conhecimento. Não tenha medo de mostrar seu trabalho, fazer perguntas e ajudar outros membros da comunidade.

Bom, agora chega de enrolação... abre seu projeto e bora criar. 🚀`;

const data = new SlashCommandBuilder()
  .setName("guia-produtores")
  .setDescription("Publica o guia inicial da área de produtores.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  if (interaction.channelId !== PRODUTORES_CHANNEL_ID) {
    return interaction.reply({
      content: `❌ Use este comando no canal <#${PRODUTORES_CHANNEL_ID}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const mensagensRecentes = await interaction.channel.messages.fetch({
      limit: 100,
    });
    const guiaJaPublicado = mensagensRecentes.some(
      (mensagem) =>
        mensagem.author.id === interaction.client.user.id &&
        mensagem.content.startsWith(INICIO_DA_MENSAGEM)
    );

    if (guiaJaPublicado) {
      return interaction.editReply(
        "⚠️ O guia dos produtores já foi publicado neste canal."
      );
    }

    const mensagem = await interaction.channel.send(MENSAGEM);

    return interaction.editReply(
      `✅ Guia dos produtores publicado.\n${mensagem.url}`
    );
  } catch (erro) {
    console.error("❌ Não foi possível publicar o guia dos produtores:", erro);

    return interaction.editReply(
      "❌ A Rafu não conseguiu publicar o guia. Confira se ela pode ver o canal, enviar mensagens e ler o histórico."
    );
  }
}

module.exports = { data, execute };
