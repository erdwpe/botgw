const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { RVO_LOG_GROUP } = require("../config");

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

function getQuotedViewOnce(msg) {
  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) return null;

  const viewOnce =
    quoted.viewOnceMessageV2?.message ||
    quoted.viewOnceMessage?.message ||
    quoted.viewOnceMessageV2Extension?.message ||
    quoted;

  const image = viewOnce.imageMessage;
  const video = viewOnce.videoMessage;

  if (image) return { type: "image", message: image };
  if (video) return { type: "video", message: video };

  return null;
}

module.exports = async function rvo(sock, msg, reply) {
  try {
    if (!RVO_LOG_GROUP) {
      await reply("RVO_LOG_GROUP belum diset di config.js");
      return;
    }

    const media = getQuotedViewOnce(msg);

    if (!media) {
      await reply("Reply media view once dengan teks: rvo / 👁 / #rvo");
      return;
    }

    const stream = await downloadContentFromMessage(
      media.message,
      media.type === "image" ? "image" : "video"
    );

    const buffer = await streamToBuffer(stream);
    const caption = media.message.caption || "";

    const now = new Date();
    const jam = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const infoCaption =
`*SUCCESS MENGAMBIL PESAN ${media.type.toUpperCase()} DI JAM ${jam}*

Caption asli:
${caption || "-"}`;

    if (media.type === "image") {
      await sock.sendMessage(RVO_LOG_GROUP, {
        image: buffer,
        caption: infoCaption
      });
    } else {
      await sock.sendMessage(RVO_LOG_GROUP, {
        video: buffer,
        caption: infoCaption
      });
    }

    console.log(`[${new Date().toLocaleString("id-ID")}] [RVO] Berhasil dikirim ke grup log: ${RVO_LOG_GROUP}`);
  } catch (e) {
    await reply("Gagal membuka view once: " + e.message);
  }
};
