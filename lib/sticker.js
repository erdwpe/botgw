const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { TMP_DIR } = require("../config");

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

  const exifPath = path.join(TMP_DIR, "sticker.exif");
  fs.writeFileSync(exifPath, exif);
  return exifPath;
}

function convertToSticker(buffer, type) {
  const id = Date.now();
  const input = path.join(TMP_DIR, `${id}-input`);
  const rawOutput = path.join(TMP_DIR, `${id}-raw.webp`);
  const output = path.join(TMP_DIR, `${id}-sticker.webp`);
  const exif = createStickerExif("erdwpe.com", "created by : erdwpe bot");

  fs.writeFileSync(input, buffer);

  try {
    const filter = "crop='min(iw,ih)':'min(iw,ih)',scale=512:512";

    if (type === "videoMessage") {
      execSync(
        `ffmpeg -y -i "${input}" -t 6 -vf "${filter},fps=15" -an -c:v libwebp_anim -loop 0 -preset default -q:v 75 "${rawOutput}"`,
        { stdio: "ignore" }
      );
    } else {
      execSync(
        `ffmpeg -y -i "${input}" -vf "${filter}" -vcodec libwebp -lossless 0 -q:v 80 "${rawOutput}"`,
        { stdio: "ignore" }
      );
    }

    execSync(
      `webpmux -set exif "${exif}" "${rawOutput}" -o "${output}"`,
      { stdio: "ignore" }
    );

    return fs.readFileSync(output);
  } finally {
    for (const f of [input, rawOutput, output, exif]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
}

module.exports = {
  convertToSticker
};