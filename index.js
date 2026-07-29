require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const anunciarCommand = require("./commands/anunciar");
const guiaProdutoresCommand = require("./commands/guiaProdutores");
const interactionCreate = require("./events/interactionCreate");
const { registrarEntrada, registrarSaida } = require("./events/memberLog");
const { iniciarMonitoramentoTwitch } = require("./services/twitch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("interactionCreate", interactionCreate);
client.on("guildMemberAdd", registrarEntrada);
client.on("guildMemberRemove", registrarSaida);

client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} está online!`);

  try {
    await client.application.commands.set([
      anunciarCommand.data.toJSON(),
      guiaProdutoresCommand.data.toJSON(),
    ]);
    console.log("✅ Comandos /anunciar e /guia-produtores registrados!");
  } catch (erro) {
    console.error("❌ Não foi possível registrar os comandos:", erro);
  }

  await iniciarMonitoramentoTwitch(client);
});

client.login(process.env.TOKEN);
