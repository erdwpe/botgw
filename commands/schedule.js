const fs = require("fs");
const { config, saveConfig, DEFAULT_CAPTION } = require("../config");
const { sleep, saveMediaFile, getQuotedMessage, getMediaType, toTargetJid } = require("../lib/helper");

const pendingSchedule = new Map();

const NOTIF_OWNERS = [
  "6281392641570@s.whatsapp.net",
  "6285141177527@s.whatsapp.net"
];

async function collectScheduleMedia(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const key = `${from}:${sender}`;

  pendingSchedule.set(key, {
    messages: [msg]
  });

  await sleep(3500);

  const data = pendingSchedule.get(key);
  pendingSchedule.delete(key);

  const result = [];
  const used = new Set();

  for (const item of data.messages) {
    if (used.has(item.key.id)) continue;
    used.add(item.key.id);

    const saved = await saveMediaFile(sock, item, false);
    if (saved) result.push(saved);
  }

  return result;
}

async function getScheduleMedia(sock, msg) {
  const quoted = getQuotedMessage(msg);

  if (quoted) {
    const saved = await saveMediaFile(sock, msg, true);
    return saved ? [saved] : [];
  }

  const type = getMediaType(msg.message);
  if (!type) return [];

  return await collectScheduleMedia(sock, msg);
}

async function sendReport(sock, log) {
  if (!config.target) {
    log("ERROR", "Target belum diset.");
    return false;
  }

  const media = config.lastMedia || [];
  const caption = config.caption || DEFAULT_CAPTION;

  if (!media.length) {
    await sock.sendMessage(config.target, { text: caption });
    log("SUCCESS", `Report teks terkirim ke ${config.target}.`);
  } else {
    for (let i = 0; i < media.length; i++) {
      const item = media[i];

      if (!item.path || !fs.existsSync(item.path)) continue;

      const payload = item.type === "video"
        ? {
            video: { url: item.path },
            mimetype: item.mimetype || "video/mp4",
            caption: i === 0 ? caption : undefined
          }
        : {
            image: { url: item.path },
            mimetype: item.mimetype || "image/jpeg",
            caption: i === 0 ? caption : undefined
          };

      await sock.sendMessage(config.target, payload);
      await sleep(900);
    }

    log("SUCCESS", `Report terkirim ke ${config.target} dengan ${media.length} media.`);

    for (const item of media) {
      try {
        if (item.path && fs.existsSync(item.path)) {
          fs.unlinkSync(item.path);
        }
      } catch {}
    }
  }

  let targetName = config.target;

  try {
    if (config.target.endsWith("@g.us")) {
      const meta = await sock.groupMetadata(config.target);
      targetName = meta.subject || config.target;
    }
  } catch {}

  const now = new Date();
  const jam = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  for (const ownerJid of NOTIF_OWNERS) {
    try {
      await sock.sendMessage(ownerJid, {
        text: `✅ Berhasil mengirim schedule di grup *${targetName}* jam *${jam}*`
      });

      log("SUCCESS", `Notif sukses dikirim ke ${ownerJid}`);
    } catch (e) {
      log("ERROR", `Gagal kirim notif owner ${ownerJid}: ${e.message}`);
    }
  }

  config.manualTime = "";
  config.lastRun = "";
  config.lastMedia = [];
  config.caption = DEFAULT_CAPTION;
  saveConfig();

  log("INFO", "Schedule selesai, jadwal/media/caption sudah direset. Target tetap tersimpan.");
  return true;
}

async function cmdSetTarget(args, reply) {
  const targetInput = args[0];

  if (!targetInput) {
    await reply("Contoh:\n#settarget 120363xxxx@g.us\n#settarget 628xxxx");
    return;
  }

  config.target = toTargetJid(targetInput);
  saveConfig();

  await reply(`Target berhasil diset:\n${config.target}`);
}

async function cmdSetJam(args, reply, log) {
  const jam = args[0];

  if (!/^\d{1,2}:\d{2}$/.test(jam || "")) {
    await reply("Format salah. Contoh:\n#setjam 22:30");
    return;
  }

  const [h, m] = jam.split(":").map(Number);

  if (h > 23 || m > 59) {
    await reply("Jam tidak valid.");
    return;
  }

  config.manualTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  config.lastRun = "";
  saveConfig();

  log("SUCCESS", `Schedule manual aktif jam ${config.manualTime}.`);
  await reply(`Jam manual berhasil diset:\n${config.manualTime}`);
}

async function cmdSchedule(sock, msg, text, reply) {
  const media = await getScheduleMedia(sock, msg);

  if (!media.length) {
    await reply("Kirim 1/2 foto dengan caption:\n#jadwal Melaporkan untuk area yoga kaliwaron beserta inventaris nya terpantau aman terkendali");
    return;
  }

  config.lastMedia = media;

  const cap = text.replace(/^#(schedule|jadwal)/i, "").trim();
  config.caption = cap || DEFAULT_CAPTION;

  saveConfig();

  await reply(
`Schedule aktif.

Target: ${config.target || "-"}
Mode: manual
Jadwal: ${config.manualTime || "-"}
Foto: ${media.filter(x => x.type === "image").length}
Video: ${media.filter(x => x.type === "video").length}

Caption:
${config.caption}`
  );
}

async function cmdStatus(reply) {
  await reply(
`Status schedule:

Target: ${config.target || "-"}
Jadwal: ${config.manualTime || "-"}
Media: ${(config.lastMedia || []).length}
Foto: ${(config.lastMedia || []).filter(x => x.type === "image").length}
Video: ${(config.lastMedia || []).filter(x => x.type === "video").length}
Caption:
${config.caption || DEFAULT_CAPTION}`
  );
}

async function cmdStop(reply) {
  config.manualTime = "";
  config.lastRun = "";

  for (const item of config.lastMedia || []) {
    try {
      if (item.path && fs.existsSync(item.path)) {
        fs.unlinkSync(item.path);
      }
    } catch {}
  }

  config.lastMedia = [];
  config.caption = DEFAULT_CAPTION;
  saveConfig();

  await reply("Schedule dimatikan dan data media/caption sudah direset. Target tetap tersimpan.");
}

async function cmdClear(reply, clearTerminal) {
  for (const item of config.lastMedia || []) {
    try {
      if (item.path && fs.existsSync(item.path)) {
        fs.unlinkSync(item.path);
      }
    } catch {}
  }

  config.lastMedia = [];
  config.caption = DEFAULT_CAPTION;
  config.lastRun = "";
  saveConfig();

  clearTerminal();
  await reply("Data schedule berhasil dibersihkan.");
}

function handleAlbumCollector(msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const key = `${from}:${sender}`;

  if (pendingSchedule.has(key)) {
    pendingSchedule.get(key).messages.push(msg);
    return true;
  }

  return false;
}

module.exports = {
  cmdSetTarget,
  cmdSetJam,
  cmdSchedule,
  cmdStatus,
  cmdStop,
  cmdClear,
  sendReport,
  handleAlbumCollector
};
