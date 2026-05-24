const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { TMP_DIR } = require("../config");

const FFMPEG = "ffmpeg";
const WEBPMUX = "webpmux";

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

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const exifPath = path.join(TMP_DIR, `sticker-${Date.now()}.exif`);
  fs.writeFileSync(exifPath, exif);
  return exifPath;
}

async function convertToSticker(buffer, type = "image") {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const id = Date.now();
  const input = path.join(TMP_DIR, `${id}-input`);
  const rawOutput = path.join(TMP_DIR, `${id}-raw.webp`);
  const output = path.join(TMP_DIR, `${id}-sticker.webp`);

  const exif = createStickerExif(
    global.packname || "created by : erdwpe bot",
    global.author || global.auhor || "erdwpe.com"
  );

  fs.writeFileSync(input, buffer);

  try {
    const isVideo = type === "video" || type === "videoMessage" || type === "gif";

    const filter =
      "scale=512:512:force_original_aspect_ratio=decrease," +
      "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000," +
      "format=rgba";

    if (isVideo) {
      execSync(
        `${FFMPEG} -y -i ${q(input)} -t 6 -vf "${filter},fps=15" -an -c:v libwebp_anim -loop 0 -preset default -q:v 75 -vsync 0 ${q(rawOutput)}`,
        { stdio: "ignore" }
      );
    } else {
      execSync(
        `${FFMPEG} -y -i ${q(input)} -vf "${filter}" -frames:v 1 -vcodec libwebp -lossless 0 -q:v 80 ${q(rawOutput)}`,
        { stdio: "ignore" }
      );
    }

    execSync(
      `${WEBPMUX} -set exif ${q(exif)} ${q(rawOutput)} -o ${q(output)}`,
      { stdio: "ignore" }
    );

    return fs.readFileSync(output);
  } finally {
    for (const f of [input, rawOutput, output, exif]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
  }
}

module.exports = {
  convertToSticker
};