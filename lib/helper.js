const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { OWNER_NUMBERS, TMP_DIR } = require("../config");

function log(type, msg) {
  const t = new Date().toLocaleString("id-ID", { hour12: false });
  console.log(`[${t}] [${type}] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function senderNumber(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function isOwnerJid(jid) {
  return OWNER_NUMBERS.includes(senderNumber(jid));
}

function toTargetJid(input) {
  input = String(input || "").trim();

  if (input.endsWith("@g.us")) return input;
  if (input.endsWith("@s.whatsapp.net")) return input;

  let num = input.replace(/\D/g, "");
  if (num.startsWith("0")) num = "62" + num.slice(1);
  if (!num.startsWith("62")) num = "62" + num;

  return num + "@s.whatsapp.net";
}

function unwrapMessage(message) {
  let m = message || {};

  if (m.ephemeralMessage) m = m.ephemeralMessage.message || {};
  if (m.viewOnceMessage) m = m.viewOnceMessage.message || {};
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message || {};
  if (m.viewOnceMessageV2Extension) m = m.viewOnceMessageV2Extension.message || {};
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message || {};

  return m;
}

function getText(msg) {
  const m = unwrapMessage(msg.message);

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  ).trim();
}

function getQuotedMessage(msg) {
  const m = unwrapMessage(msg.message);
  const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
  return quoted ? unwrapMessage(quoted) : null;
}

function getMediaType(message) {
  const m = unwrapMessage(message);
  if (!m) return null;
  if (m.imageMessage) return "imageMessage";
  if (m.videoMessage) return "videoMessage";
  return null;
}

async function downloadMedia(sock, msg, quoted = false) {
  let messageObj = msg;

  if (quoted) {
    messageObj = {
      key: msg.key,
      message: getQuotedMessage(msg)
    };
  }

  return await downloadMediaMessage(
    messageObj,
    "buffer",
    {},
    {
      logger: pino({ level: "silent" }),
      reuploadRequest: sock.updateMediaMessage
    }
  );
}

async function saveMediaFile(sock, msg, quoted = false) {
  const message = quoted ? getQuotedMessage(msg) : msg.message;
  const type = getMediaType(message);

  if (!type) return null;

  const buffer = await downloadMedia(sock, msg, quoted);
  const ext = type === "videoMessage" ? "mp4" : "jpg";
  const file = path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

  fs.writeFileSync(file, buffer);

  return {
    path: file,
    type: type === "videoMessage" ? "video" : "image",
    mimetype: type === "videoMessage" ? "video/mp4" : "image/jpeg"
  };
}

module.exports = {
  log,
  sleep,
  senderNumber,
  isOwnerJid,
  toTargetJid,
  unwrapMessage,
  getText,
  getQuotedMessage,
  getMediaType,
  downloadMedia,
  saveMediaFile
};