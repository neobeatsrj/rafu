const {
  ActionRowBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("anunciar")
  .setDescription("Cria uma prévia de anúncio para o canal de lançamentos.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("anunciar:tipo")
    .setPlaceholder("Escolha o tipo de anúncio")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Novo lançamento")
        .setDescription("Single, EP ou álbum")
        .setEmoji("💿")
        .setValue("lancamento"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Novo vídeo")
        .setDescription("Vídeo ou conteúdo novo")
        .setEmoji("▶️")
        .setValue("video"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Live especial")
        .setDescription("Anúncio manual de uma live")
        .setEmoji("🟣")
        .setValue("live"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Evento")
        .setDescription("Evento, encontro ou estreia")
        .setEmoji("🎉")
        .setValue("evento"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Comunicado")
        .setDescription("Aviso oficial da comunidade")
        .setEmoji("📝")
        .setValue("comunicado")
    );

  await interaction.reply({
    content: "📢 **Criar anúncio**\n\nEscolha o tipo que deseja preparar:",
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });
}

module.exports = { data, execute };
