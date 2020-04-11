const DatabaseStatic = require("./database_static");
const DatabaseDynamic = require("./database_dynamic");
const DatabaseScripts = require("./database_scripts");
const Client = require("./client");
const Server = require("./server");
const AdminServer = require("./admin_server");

module.exports = {
  DatabaseStatic,
  DatabaseDynamic,
  DatabaseScripts,
  Client,
  Server,
  AdminServer
};
