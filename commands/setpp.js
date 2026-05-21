const { downloadMediaMessage, S_WHATSAPP_NET } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { getQuotedMessage, getMediaType, log } = require("../lib/helper");
const { generateProfilePicture } = require("../simple");

module.exports = async function setpp(sock, msg, reply) {
  const quoted = getQuotedMessage(msg);
  const sourceMsg = quoted ? { key: msg.key, message: quoted } : msg;
  const type = getMediaType(sourceMsg.message);

  if (type !== "imageMessage") {
    await reply("Kirim/reply foto dengan caption:\n#setppbotpanjang");
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

    const { img } = await generateProfilePicture(buffer);

    await sock.query({
      tag: "iq",
      attrs: {
        to: S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture"
      },
      content: [
        {
          tag: "picture",
          attrs: { type: "image" },
          content: img
        }
      ]
    });

    await reply("Berhasil mengganti foto profil bot ✅");
  } catch (e) {
    log("ERROR", "Set PP bot gagal: " + e.message);
    await reply("Gagal mengganti foto profil bot.");
  }
};