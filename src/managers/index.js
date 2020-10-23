const { AdminScripts } = require("./admin_scripts");
const { AdminServer } = require("./admin_server");
const { Client } = require("./client");
const { Server } = require("./server");
const { Editor } = require("./editor");
const { Backup } = require("./backup");
const { AI } = require("./ai");

module.exports = {
  core_admin_scripts: AdminScripts,
  core_admin_server: AdminServer,
  core_client: Client,
  core_server: Server,
  core_editor: Editor,
  core_backup: Backup,
  core_ai: AI
};
