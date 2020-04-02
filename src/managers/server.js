const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Server } = require("../net/server");

class ServerManager {
  constructor({
    root_module,
    config,
    parse_packet,
    DefaultObjectClass = null
  }) {
    this.root_module = root_module;
    this.managers = this.root_module.managers;

    this.config = config;
    this.parse_packet = parse_packet;

    this.server = new Server(this.config);

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
    for (const [packet_id] of Object.entries(this.parse_packet)) {
      parse_packet_dict[packet_id] = (connection, data) => {
        return this.parse_packet[packet_id](connection, data, this.managers);
      };
    }
    return parse_packet_dict;
  }

  handle_error(connection, received_data, managers, message) {
    if (message != null) logger.error("Error:", message);
    logger.error(
      "Connection ID:",
      connection.get_id(),
      "Received_data:",
      received_data
    );

    managers.virtual_world_server.send(connection.get_id(), "error", {
      received_data,
      error: message != null ? message : ""
    });
  }
}

module.exports = ServerManager;
