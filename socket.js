const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");

const {
  OWNER_NUMBERS,
  CONFIG_FILE,
  SESSION_DIR,
  config,
  saveConfig
} = require("./config");

const {
  log,
  senderNumber,
  isOwnerJid,
  getText,
  getMediaType
} = require("./lib/helper");

const menu = require("./commands/menu");
const cmdSticker = require("./commands/sticker");
const setpp = require("./commands/setpp");
const rvo = require("./commands/rvo");

const {
  cmdSetTarget,
  cmdSetJam,
  cmdSchedule,
  cmdStatus,
  cmdStop,
  cmdClear,
  sendReport,
  handleAlbumCollector
} = require("./commands/schedule");

let isSendingSchedule = false;
let isConnected = false;

function clearTerminal() {
  console.clear();
  console.log("========================================");
  console.log("          WA SCHEDULE REPORT BOT");
  console.log("========================================");
  console.log("Owner  :", (OWNER_NUMBERS || []).join(", "));
  console.log("Config :", CONFIG_FILE);
  console.log("Session:", SESSION_DIR);
  console.log("Backup : ./session.json");
  console.log("========================================");
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function todayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function checkSchedule(sock) {
  if (isSendingSchedule) return;
  if (!isConnected) return;
  if (!config.manualTime) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = timeToMinutes(config.manualTime);

  const todayKey = todayDateKey();
  const runKey = `${todayKey} ${config.manualTime}`;

  const toleranceMinutes = 10;
  const diff = currentMinutes - targetMinutes;

  if (diff >= 0 && diff <= toleranceMinutes && config.lastRun !== runKey) {
    isSendingSchedule = true;

    try {
      log("INFO", `Schedule masuk window kirim. Telat ${diff} menit.`);

      await sendReport(sock, log, OWNER_NUMBERS);
      log("SUCCESS", "Schedule sukses dikirim dan lastRun dihapus.");
    } catch (e) {
      log("ERROR", "Gagal kirim schedule: " + e.message);
    } finally {
      isSendingSchedule = false;
    }
  }
}

async function startBot() {
  clearTerminal();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "fatal" }),
    markOnlineOnConnect: true,
    syncFullHistory: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 250
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nSCAN QR DI BAWAH INI:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      isConnected = true;


      log("SUCCESS", "Bot berhasil terhubung ke WhatsApp.");

      if (config.manualTime) {
        log("SUCCESS", `Schedule manual aktif jam ${config.manualTime}.`);
      }

      setTimeout(() => {
        checkSchedule(sock);
      }, 5000);
    }

    if (connection === "close") {
      isConnected = false;

      const reason = lastDisconnect?.error?.output?.statusCode;

      log("ERROR", `Koneksi close. Reason: ${reason}`);

      if (reason !== DisconnectReason.loggedOut) {
        log("INFO", "Reconnect...");
        setTimeout(startBot, 3000);
      } else {
        log("ERROR", "Session logout. Hapus folder session lalu scan ulang.");
      }
    }
  });

  setInterval(async () => {
    await checkSchedule(sock);
  }, 20000);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      for (const msg of messages) {
        if (!msg.message) continue;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isOwner = isOwnerJid(sender) || fromMe;

        const mediaType = getMediaType(msg.message);

        if (mediaType && handleAlbumCollector(msg)) {
          continue;
        }

const text = getText(msg);

const reply = async (txt) => {
  await sock.sendMessage(from, { text: txt }, { quoted: msg });
};

const lowerText = text.trim().toLowerCase();

if (lowerText === "rvo" || lowerText === "r") {
  if (!isOwner) continue;
  await rvo(sock, msg, reply);
  continue;
}

if (!text.startsWith("#")) continue;

const args = text.split(/\s+/);
const cmd = args.shift().toLowerCase();        

        console.log("--------------------------------------------------");
        log("INFO", `COMMAND MASUK : ${cmd}`);
        log("INFO", `SENDER        : ${senderNumber(sender)}`);
        log("INFO", `FROM ME       : ${fromMe}`);

        if (!isOwner) {
          log("WARN", "Command ditolak dari non-owner.");
          continue;
        }

        if (cmd === "#menu") {
          await menu(reply);
        }

        else if (cmd === "#myid") {
          await reply(`ID kamu:\n${senderNumber(sender)}`);
        }

        else if (cmd === "#groups") {
          const groups = await sock.groupFetchAllParticipating();
          let teks = "List group:\n\n";

          for (const id in groups) {
            teks += `${groups[id].subject}\n${id}\n\n`;
          }

          await reply(teks.trim());
        }

        else if (cmd === "#settarget") {
          await cmdSetTarget(args, reply);
        }

        else if (cmd === "#setjam") {
          await cmdSetJam(args, reply, log);
        }

        else if (cmd === "#schedule" || cmd === "#jadwal") {
          await cmdSchedule(sock, msg, text, reply);
        }

        else if (cmd === "#status") {
          await cmdStatus(reply);
        }

        else if (cmd === "#stop") {
          await cmdStop(reply);
        }

        else if (cmd === "#clear") {
          await cmdClear(reply, clearTerminal);
        }

        else if (cmd === "#setppbotpanjang" || cmd === "#setpp") {
          await setpp(sock, msg, reply);
        }

        else if (cmd === "#rvo") {
          await rvo(sock, msg, reply);
        }

        else if (cmd === "#s" || cmd === "#sticker") {
          await cmdSticker(sock, msg);
        }
      }
    } catch (e) {
      log("ERROR", e.message);
    }
  });
}

module.exports = {
  startBot
};

