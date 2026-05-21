const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { getQuotedMessage, getMediaType, log } = require("../lib/helper");

module.exports = async function rvo(sock, msg, reply) {
  const quoted = getQuotedMessage(msg);

  if (!quoted) {
    await reply("Reply foto/video view once dengan command:\n#rvo");
    return;
  }

  const type = getMediaType(quoted);

  if (!type) {
    await reply("Media view once tidak ditemukan. Reply foto/video view once.");
    return;
  }

  try {
    const buffer = await downloadMediaMessage(
      {
        key: msg.key,
        message: quoted
      },
      "buffer",
      {},
      {
        logger: pino({ level: "silent" }),
        reuploadRequest: sock.updateMediaMessage
      }
    );

    if (type === "imageMessage") {
      await sock.sendMessage(msg.key.remoteJid, {
        image: buffer,
        caption: "Read view once berhasil ✅"
      }, { quoted: msg });
    } else if (type === "videoMessage") {
      await sock.sendMessage(msg.key.remoteJid, {
        video: buffer,
        caption: "Read view once berhasil ✅"
      }, { quoted: msg });
    }
  } catch (e) {
    log("ERROR", "RVO gagal: " + e.message);
    await reply("Gagal membaca view once.");
  }
};