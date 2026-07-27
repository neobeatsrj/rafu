const { PermissionFlagsBits } = require("discord.js");

function podeAnunciar(interaction) {
  return Boolean(
    interaction.inGuild() &&
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  );
}

module.exports = { podeAnunciar };
