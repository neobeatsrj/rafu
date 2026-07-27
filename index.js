require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const CHANNEL_ID = "1529886257038098512"; // ID do canal #regras

client.once('clientReady', async () => {
  console.log(`✅ ${client.user.tag} está online!`);

  try {
    const canal = await client.channels.fetch(CHANNEL_ID);

    const mensagem = await canal.send(`🤖 **Olá! Eu sou a Rafu, assistente oficial da Bagua Records.**

Antes de explorar o servidor, reserve um minuto para ler as regras da comunidade.

> **1️⃣ Respeite todos.**
> Trate todos os membros com educação, independentemente de opinião, nacionalidade, gênero ou artista favorito.
>
> **2️⃣ Tolerância zero para conteúdo ofensivo ou ilegal.**
> Não é permitido racismo, homofobia, xenofobia, sexismo, assédio, gore, conteúdo adulto, compartilhar fotos ou informações pessoais de outros membros sem autorização ou qualquer conteúdo que viole a legislação.
>
> **3️⃣ Sem spam ou divulgação.**
> Não faça flood, spam ou divulgue outros servidores, redes sociais ou projetos fora dos canais destinados para isso.
>
> **4️⃣ Respeite os bastidores.**
> Conteúdos exclusivos, prévias e bastidores compartilhados neste servidor não devem ser repostados, distribuídos ou vazados sem autorização.
>
> **5️⃣ Use os canais corretamente.**
> Utilize os canais da comunidade para cada assunto. Cada categoria possui um propósito específico para manter o servidor organizado.
>
> **6️⃣ Divirta-se e fortaleça a comunidade.**
> Este servidor foi criado para aproximar fãs, produtores e artistas. Aproveite, participe e faça parte da comunidade.

⚠️ **O descumprimento das regras poderá resultar em advertência, suspensão ou banimento do servidor.**

✅ **Reaja com este emoji para confirmar que leu e concorda com as regras.**

Se tiver qualquer dúvida, marque a **Rafu** ou a equipe de **Staff**. Seja bem-vindo(a)! 💙`);

    await mensagem.react("✅");
    await mensagem.pin();

    console.log("📨 Mensagem enviada!");
    console.log("✅ Reação adicionada!");
    console.log("📌 Mensagem fixada!");
  } catch (erro) {
    console.error(erro);
  }
});

client.login(process.env.TOKEN);