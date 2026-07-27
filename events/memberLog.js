const { EmbedBuilder } = require("discord.js");

const ENTRADAS_CHANNEL_ID = "1531163459205730385";

async function buscarCanalDeEntradas(guild) {
  const canal = await guild.channels.fetch(ENTRADAS_CHANNEL_ID);

  if (!canal || !canal.isTextBased()) {
    throw new Error("O canal privado de entradas não foi encontrado.");
  }

  return canal;
}

async function registrarEntrada(member) {
  try {
    const canal = await buscarCanalDeEntradas(member.guild);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("👋 Novo membro entrou")
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Usuário",
          value: `${member} — \`${member.user.tag}\``,
        },
        {
          name: "Conta criada",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Membros no servidor",
          value: String(member.guild.memberCount),
          inline: true,
        }
      )
      .setTimestamp();

    await canal.send({ embeds: [embed] });
    console.log(`👋 Entrada registrada: ${member.user.tag}`);
  } catch (erro) {
    console.error("❌ Não foi possível registrar a entrada:", erro.message);
  }
}

async function registrarSaida(member) {
  try {
    const canal = await buscarCanalDeEntradas(member.guild);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🚪 Membro saiu")
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Usuário",
          value: `\`${member.user.tag}\` — ID: \`${member.id}\``,
        },
        {
          name: "Membros no servidor",
          value: String(member.guild.memberCount),
          inline: true,
        }
      )
      .setTimestamp();

    await canal.send({ embeds: [embed] });
    console.log(`🚪 Saída registrada: ${member.user.tag}`);
  } catch (erro) {
    console.error("❌ Não foi possível registrar a saída:", erro.message);
  }
}

module.exports = {
  registrarEntrada,
  registrarSaida,
};
