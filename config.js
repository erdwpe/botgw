const fs = require("fs");

const RVO_LOG_GROUP = "120363023026988920@g.us";

const OWNER_NUMBERS = [
  "34578832064574",
  "95550691102846"
];

const DEFAULT_CAPTION =
  "Melaporkan untuk area yoga kaliwaron beserta inventaris nya terpantau aman terkendali";

const CONFIG_FILE = "./config.json";
const SESSION_DIR = "./session";
const TMP_DIR = "./tmp";

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

let config = {
  target: "",
  manualTime: "",
  lastMedia: [],
  caption: DEFAULT_CAPTION,
  lastRun: ""
};

if (fs.existsSync(CONFIG_FILE)) {
  config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}


module.exports = {
  OWNER_NUMBERS,
  RVO_LOG_GROUP,
  DEFAULT_CAPTION,
  CONFIG_FILE,
  SESSION_DIR,
  TMP_DIR,
  config,
  saveConfig
};
