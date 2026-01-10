const pino = require("pino");
const Discord = require("discord.js");
let discordClient = null;

const sendToDiscord = (
  importName,
  results,
  logFilePath,
  resultImportFile = null
) => {
  const formatMessage = () => {
    return `
Résultats d'exécution de \`${importName}\` :
- Lignes mises à jour : **${results.UPDATED}**
- Avertissements : **${results.WARNING}**
- Erreurs : **${results.ERROR}**
Ci-joint ${
      resultImportFile ? "les lignes modifiées et " : ""
    }les logs d'exécution.  
`;
  };

  const filesToSend = [];

  if (resultImportFile !== null) {
    filesToSend.push(resultImportFile);
  }

  filesToSend.push(logFilePath);

  if (
    !process.env.DISCORD_BOT_TOKEN ||
    !process.env.DISCORD_NOTIFICATION_CHANNEL
  ) {
    console.log("Import finished, check log file at " + logFilePath);
    return;
  }
  /**
   * @var {Discord.Client} discordClient
   */
  discordClient = new Discord.Client({
    intents: [Discord.GatewayIntentBits.GuildMessages],
  });
  discordClient.login(process.env.DISCORD_BOT_TOKEN);
  discordClient.on("ready", function () {
    this.channels
      .fetch(process.env.DISCORD_NOTIFICATION_CHANNEL)
      .then((channel) => {
        console.log(logFilePath);
        channel.send({ content: formatMessage(), files: filesToSend });
      })
      .finally(() => {
        discordClient.destroy();
      });
  });
};

module.exports = (importName) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const logFilePath = `${__dirname}/logs/${importName}_${year}-${month}-${day}_${hour}-${minutes}.log`;
  const transport = pino.transport({
    target: "pino/file",
    options: { destination: logFilePath },
  });

  const logger = pino(
    {
      formatters: {
        bindings: (bindings) => {
          delete bindings.hostname;
          delete bindings.pid;
          return bindings;
        },
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    transport
  );

  const resultImport = {
    UPDATED: 0,
    WARNING: 0,
    ERROR: 0,
  };

  return {
    addUpdated: () => resultImport.UPDATED++,
    addInfo: (message) => {
      logger.info(message);
    },
    addWarn: (message) => {
      logger.warn(message);
      resultImport.WARNING++;
    },
    addError: (message) => {
      logger.error(message), resultImport.ERROR++;
    },
    setResultImportFile: (_resultImportFile) =>
      (resultImportFile = _resultImportFile),
    sendToDiscord: () =>
      sendToDiscord(importName, resultImport, logFilePath, resultImportFile),
    logFilePath,
  };
};
