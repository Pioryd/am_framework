const path = require("path");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Server } = require("../../net/server");
const ParsePacket = require("./parse_packet");
/*
  Responsible for:
    - parse/send packets
*/
class AdminServerManager {
  constructor(root_module, DefaultObjectClass) {
    this.root_module = root_module;
    this.config = this.root_module.config;

    this.server = new Server({
      port: this.config.admin_server.port,
      options: { packet_timeout: 0 }
    });

    this.DefaultObjectClass = DefaultObjectClass;
  }

  initialize() {
    if (this.server == null) {
      logger.info("Unable to set server");
      return;
    }

    this.server.add_parse_packet_dict(this.create_parse_packet_dict());

    this.server.start();
  }

  terminate() {
    if (this.server != null) {
      this.server.stop();
      this.server = null;
    }
  }

  poll() {
    this.server.poll();
  }

  send(connection_id, packet_id, data) {
    this.server.send(connection_id, packet_id, data);
  }

  create_parse_packet_dict() {
    let parse_packet_dict = {};
    for (const [packet_id] of Object.entries(ParsePacket)) {
      parse_packet_dict[packet_id] = (connection, data) => {
        return ParsePacket[packet_id](
          connection,
          data,
          this.root_module.managers
        );
      };
    }
    return parse_packet_dict;
  }
}

module.exports = AdminServerManager;
