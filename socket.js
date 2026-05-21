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
    sleep,
    senderNumber,
    isOwnerJid,
    getText,
    getMediaType
  } = require("./lib/helper");
  
  const menu = require("./commands/menu");
  const sticker = require("./commands/sticker");
  const setpp = require("./commands/setpp");
  const rvo = require("./commands/rvo");
  
  const {
    setTarget,
    setJam,
    schedule,
    status,
    stop,
    clear,
    sendReport,
    handleAlbumCollector
  } = require("./commands/schedule");
  
  function clearTerminal() {
    console.clear();
    console.log("========================================");
    console.log("          WA SCHEDULE REPORT BOT");
    console.log("========================================");
    console.log("Owner  :", OWNER_NUMBERS.join(", "));
    console.log("Config :", CONFIG_FILE);
    console.log("Session:", SESSION_DIR);
    console.log("Backup : ./session.json");
    console.log("========================================");
  }
  
  async function startBot() {
    clearTerminal();
  
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
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
        clearTerminal();
        log("SUCCESS", "Bot berhasil terhubung ke WhatsApp.");
  
        if (config.manualTime) {
          log("SUCCESS", `Schedule manual aktif jam ${config.manualTime}.`);
        }
      }
  
      if (connection === "close") {
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
      if (!config.manualTime) return;
  
      const now = new Date();
      const current =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");
  
      if (current === config.manualTime && config.lastRun !== current) {
        config.lastRun = current;
        saveConfig();
        await sendReport(sock, log);
      }
  
      if (current !== config.manualTime && config.lastRun) {
        config.lastRun = "";
        saveConfig();
      }
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
          if (!text.startsWith("#")) continue;
  
          const args = text.split(/\s+/);
          const cmd = args.shift().toLowerCase();
  
          log("INFO", `COMMAND MASUK : ${cmd}`);
          log("INFO", `SENDER        : ${senderNumber(sender)}`);
          log("INFO", `FROM ME       : ${fromMe}`);
  
          const reply = async (txt) => {
            await sock.sendMessage(from, { text: txt }, { quoted: msg });
          };
  
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
            await setTarget(args, reply);
          }
  
          else if (cmd === "#setjam") {
            await setJam(args, reply, log);
          }
  
          else if (cmd === "#schedule" || cmd === "#jadwal") {
            await schedule(sock, msg, text, reply);
          }
  
          else if (cmd === "#status") {
            await status(reply);
          }
  
          else if (cmd === "#stop") {
            await stop(reply);
          }
  
          else if (cmd === "#clear") {
            await clear(reply, clearTerminal);
          }
  
          else if (cmd === "#setppbotpanjang" || cmd === "#setpp") {
            await setpp(sock, msg, reply);
          }
  
          else if (cmd === "#rvo") {
            await rvo(sock, msg, reply);
          }
  
          else if (cmd === "#s" || cmd === "#sticker") {
            await sticker(sock, msg);
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