require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const anunciarCommand = require("./commands/anunciar");
const guiaProdutoresCommand = require("./commands/guiaProdutores");
const painelCollabsCommand = require("./commands/painelCollabs");
const interactionCreate = require("./events/interactionCreate");
const { registrarEntrada, registrarSaida } = require("./events/memberLog");
const { iniciarMonitoramentoTwitch } = require("./services/twitch");
const { iniciarPlayerServer } = require("./services/playerServer");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("interactionCreate", interactionCreate);
client.on("guildMemberAdd", registrarEntrada);
client.on("guildMemberRemove", registrarSaida);

iniciarPlayerServer();

client.once("clientReady", async () => {
  console.log(`✅ ${client.user.tag} está online!`);

  try {
    await client.application.commands.set([
      anunciarCommand.data.toJSON(),
      guiaProdutoresCommand.data.toJSON(),
      painelCollabsCommand.data.toJSON(),
    ]);
    console.log(
      "✅ Comandos /anunciar, /guia-produtores e /painel-collabs registrados!"
    );
  } catch (erro) {
    console.error("❌ Não foi possível registrar os comandos:", erro);
  }

  await iniciarMonitoramentoTwitch(client);
});

client.login(process.env.TOKEN);
