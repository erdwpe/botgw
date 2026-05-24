const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { getQuotedMessage, getMediaType, log } = require("../lib/helper");
const { convertToSticker } = require("../lib/sticker");

module.exports = async function cmdSticker(sock, msg) {
  const quoted = getQuotedMessage(msg);
  const sourceMsg = quoted ? { key: msg.key, message: quoted } : msg;
  const type = getMediaType(sourceMsg.message);

  if (!type) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "Reply/kirim foto/video dengan caption #s"
    }, { quoted: msg });
    return;
  }

  try {
    const buffer = await downloadMediaMessage(
      sourceMsg,
      "buffer",
      {},
      {
        logger: pino({ level: "silent" }),
        reuploadRequest: sock.updateMediaMessage
      }
    );

    const stickerBuffer = await convertToSticker(buffer, type);

    await sock.sendMessage(msg.key.remoteJid, {
      sticker: stickerBuffer
    }, { quoted: msg });

  } catch (e) {
    log("ERROR", "Sticker gagal: " + e.message);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "Gagal bikin sticker. Pastikan foto/video valid. Video max 6 detik."
    }, { quoted: msg });
  }
};
