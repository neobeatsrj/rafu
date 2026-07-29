const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const COLLABS_CHANNEL_ID = "1531681458526224395";
const PAINEL_CUSTOM_ID = "collab:abrir";

const data = new SlashCommandBuilder()
  .setName("painel-collabs")
  .setDescription("Publica e fixa o painel para envio de collabs.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

function montarPainel() {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🤝 Procurando uma collab?")
    .setDescription(
      "Me envie seu sample, beat ou projeto e diga o que você procura: um produtor, um MC ou alguém para finalizar a ideia com você.\n\n" +
        "Eu coloco sua ideia em circulação para produtores, artistas, convidados e profissionais que fazem parte ou chegam à comunidade. Conforme este espaço cresce, seu projeto pode alcançar novas conexões — inclusive produtores do mainstream que passem por aqui.\n\n" +
        "Quem tiver interesse poderá ouvir o material e entrar em contato para colaborar.\n\n" +
        "Clique abaixo para começar."
    );

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(PAINEL_CUSTOM_ID)
      .setLabel("Enviar minha collab")
      .setEmoji("📤")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [botoes] };
}

async function execute(interaction) {
  if (interaction.channelId !== COLLABS_CHANNEL_ID) {
    return interaction.reply({
      content: `❌ Use este comando no canal <#${COLLABS_CHANNEL_ID}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const mensagensRecentes = await interaction.channel.messages.fetch({
      limit: 100,
    });
    const painelExistente = mensagensRecentes.find(
      (mensagem) =>
        mensagem.author.id === interaction.client.user.id &&
        mensagem.components.some((linha) =>
          linha.components.some(
            (componente) => componente.customId === PAINEL_CUSTOM_ID
          )
        )
    );

    if (painelExistente) {
      await painelExistente.edit(montarPainel());

      if (!painelExistente.pinned) {
        await painelExistente.pin("Painel de collabs da Rafu");
      }

      return interaction.editReply(
        `✅ Painel de collabs atualizado e fixado.\n${painelExistente.url}`
      );
    }

    const painel = await interaction.channel.send(montarPainel());
    await painel.pin("Painel de collabs da Rafu");

    return interaction.editReply(
      `✅ Painel de collabs publicado e fixado.\n${painel.url}`
    );
  } catch (erro) {
    console.error("❌ Não foi possível publicar o painel de collabs:", erro);

    return interaction.editReply(
      "❌ Não consegui publicar ou fixar o painel. Confira se posso enviar mensagens, ler o histórico e gerenciar mensagens neste canal."
    );
  }
}

module.exports = { data, execute };
