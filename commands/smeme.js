const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { TMP_DIR } = require("../config");
const { getQuotedMessage } = require("../lib/helper");
const { convertToSticker } = require("../lib/sticker");
async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key }
    });
  } catch {}
}
function q(p) {
  return `"${String(p).replace(/"/g, '\\"')}"`;
}

function escText(t) {
  return String(t)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,");
}

function wrapText(text, max = 17) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if ((line + " " + word).trim().length > max) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }

  if (line) lines.push(line);
  return lines.join("\\n");
}

function getFontPath() {
  if (process.platform === "win32") {
    return "C\\\\:/Windows/Fonts/arialbd.ttf";
  }

  const localFont = path.join(__dirname, "../assets/font/arialbd.ttf");

  if (fs.existsSync(localFont)) {
    return localFont.replace(/\\/g, "/");
  }

  return "/system/fonts/Roboto-Bold.ttf";
}

module.exports = async function smeme(sock, msg, args, reply) {
  const quoted = getQuotedMessage(msg);
  const mainMsg = msg.message || {};

  const mediaMsg =
    quoted?.imageMessage || quoted?.stickerMessage
      ? quoted
      : mainMsg.imageMessage || mainMsg.stickerMessage
      ? mainMsg
      : null;

  const text = args.join(" ").trim();
  const respond = "Kirim/reply image/sticker dengan caption #smeme text1|text2";

  if (!mediaMsg) return reply(respond);
  if (!text) return reply(respond);

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const [topRaw, bottomRaw] = text.split("|");
  const atas = topRaw?.trim() || "-";
  const bawah = bottomRaw?.trim() || "-";

  const id = Date.now();
  const input = path.join(TMP_DIR, `${id}-input`);
  const bg = path.join(TMP_DIR, `${id}-bg.png`);
  const meme = path.join(TMP_DIR, `${id}-meme.png`);

  try {
    await react(sock, msg, "⏳");

    const sourceMsg = {
      key: msg.key,
      message: mediaMsg
    };

    const buffer = await downloadMediaMessage(
      sourceMsg,
      "buffer",
      {},
      {
        logger: pino({ level: "silent" }),
        reuploadRequest: sock.updateMediaMessage
      }
    );

    fs.writeFileSync(input, buffer);

    execSync(
      `ffmpeg -y -i ${q(input)} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" -frames:v 1 ${q(bg)}`,
      { stdio: "ignore" }
    );

    const font = getFontPath();

    const safeAtas = escText(wrapText(atas.toUpperCase(), 17));
    const safeBawah = escText(wrapText(bawah.toUpperCase(), 17));

    const filter =
      `drawtext=fontfile=${font}:text='${safeAtas}':fontcolor=white:fontsize=38:borderw=4:bordercolor=black:line_spacing=6:x=(w-text_w)/2:y=25,` +
      `drawtext=fontfile=${font}:text='${safeBawah}':fontcolor=white:fontsize=38:borderw=4:bordercolor=black:line_spacing=6:x=(w-text_w)/2:y=h-text_h-25,` +
      `format=rgba`;

    execSync(
      `ffmpeg -y -i ${q(bg)} -vf "${filter}" -frames:v 1 ${q(meme)}`,
      { stdio: "ignore" }
    );

    const stickerBuffer = await convertToSticker(fs.readFileSync(meme), "image");

    await sock.sendMessage(
      msg.key.remoteJid,
      { sticker: stickerBuffer },
      { quoted: msg }
    );
    await react(sock, msg, "✅");
  } catch (e) {
    console.log("[SMEME ERROR]", e.message);
    await reply("Gagal bikin sticker meme.");
  } finally {
    for (const f of [input, bg, meme]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
  }
};