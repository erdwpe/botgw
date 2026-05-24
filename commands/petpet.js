const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { TMP_DIR } = require("../config");
const { getQuotedMessage } = require("../lib/helper");

function q(p) {
  return `"${String(p).replace(/"/g, '\\"')}"`;
}

function createStickerExif(packname, author) {
  const json = {
    "sticker-pack-id": "wa-schedule-report-bot",
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
    emojis: ["🤖"]
  };

  const data = Buffer.from(JSON.stringify(json), "utf8");

  const exif = Buffer.concat([
    Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00,
      0x41, 0x57,
      0x07, 0x00
    ]),
    Buffer.from([
      data.length & 0xff,
      (data.length >> 8) & 0xff,
      (data.length >> 16) & 0xff,
      (data.length >> 24) & 0xff,
      0x16, 0x00, 0x00, 0x00
    ]),
    data
  ]);

  const exifPath = path.join(TMP_DIR, `petpet-${Date.now()}.exif`);
  fs.writeFileSync(exifPath, exif);
  return exifPath;
}

module.exports = async function petpet(sock, msg, args, reply) {
  const quoted = getQuotedMessage(msg);
  const mainMsg = msg.message || {};

  const mediaMsg =
    quoted?.imageMessage || quoted?.stickerMessage
      ? quoted
      : mainMsg.imageMessage || mainMsg.stickerMessage
      ? mainMsg
      : null;

  if (!mediaMsg) {
    await reply("Kirim/reply image/sticker dengan caption #petpet");
    return;
  }

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const id = Date.now();
  const input = path.join(TMP_DIR, `${id}-pet-input`);
  const avatar = path.join(TMP_DIR, `${id}-avatar.png`);
  const frameDir = path.join(TMP_DIR, `${id}-pet-frames`);
  const rawWebp = path.join(TMP_DIR, `${id}-petpet-raw.webp`);
  const finalWebp = path.join(TMP_DIR, `${id}-petpet-final.webp`);

  const assetDir = path.join(__dirname, "../assets/petpet");

  let exif = null;

  try {
    await reply("Membuat petpet...");

    fs.mkdirSync(frameDir, { recursive: true });

    for (let i = 0; i < 5; i++) {
      const asset = path.join(assetDir, `${i}.png`);
      if (!fs.existsSync(asset)) {
        await reply(`Asset petpet kurang: assets/petpet/${i}.png`);
        return;
      }
    }

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
      `ffmpeg -y -i ${q(input)} -vf "scale=112:112:force_original_aspect_ratio=increase,crop=112:112,format=rgba" -frames:v 1 ${q(avatar)}`,
      { stdio: "ignore" }
    );

    const positions = [
      { x: 22, y: 32, w: 92, h: 92 },
      { x: 18, y: 38, w: 96, h: 88 },
      { x: 16, y: 44, w: 100, h: 84 },
      { x: 18, y: 38, w: 96, h: 88 },
      { x: 22, y: 32, w: 92, h: 92 }
    ];

    for (let i = 0; i < 5; i++) {
      const hand = path.join(assetDir, `${i}.png`);
      const out = path.join(frameDir, `${i}.png`);
      const p = positions[i];

      execSync(
        `ffmpeg -y -i ${q(avatar)} -i ${q(hand)} -filter_complex "` +
          `[0:v]scale=${p.w}:${p.h}[ava];` +
          `color=c=0x00000000:s=112x112:d=1[base];` +
          `[base][ava]overlay=${p.x}:${p.y}[tmp];` +
          `[tmp][1:v]overlay=0:0,format=rgba` +
          `" -frames:v 1 ${q(out)}`,
        { stdio: "ignore" }
      );
    }

    execSync(
      `ffmpeg -y -framerate 22 -i ${q(path.join(frameDir, "%d.png"))} -loop 0 -vf "scale=512:512:flags=lanczos,fps=22" -c:v libwebp_anim -lossless 0 -q:v 75 -preset default -an -vsync 0 ${q(rawWebp)}`,
      { stdio: "ignore" }
    );

    exif = createStickerExif(
      global.packname || "created by : erdwpe bot",
      global.author || global.auhor || "erdwpe.com"
    );

    execSync(
      `webpmux -set exif ${q(exif)} ${q(rawWebp)} -o ${q(finalWebp)}`,
      { stdio: "ignore" }
    );

    await sock.sendMessage(
      msg.key.remoteJid,
      { sticker: fs.readFileSync(finalWebp) },
      { quoted: msg }
    );
  } catch (e) {
    console.log("[PETPET ERROR]", e.message);
    await reply("Gagal bikin petpet. Cek log terminal.");
  } finally {
    for (const f of [input, avatar, rawWebp, finalWebp, exif]) {
      try {
        if (f && fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }

    try {
      if (fs.existsSync(frameDir)) {
        fs.rmSync(frameDir, { recursive: true, force: true });
      }
    } catch {}
  }
};