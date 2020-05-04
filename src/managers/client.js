const NetClient = require("../net/client").Client;

class Client {
  constructor({ root_module, config, parse_packet, on_connected }) {
    this.root_module = root_module;
    this.config = config;
    this.parse_packet = parse_packet;
    this.on_connected = on_connected;

    this.client = new NetClient({
      options: this.config.options,
      socket_io_options: this.config.socket_io_options
    });
  }

  initialize() {
    this.client.events.connected = this.on_connected;
    this.client.add_parse_packet_dict(this._create_parse_packet_dict());

    this._connect();
  }

  terminate() {
    this._disconnect();
  }

  poll() {
    this.client.poll();
  }

  _connect() {
    this.client.connect();
  }

  _disconnect() {
    this.client.disconnect();
  }

  _create_parse_packet_dict() {
    let parse_packet_dict = {};
    for (const [packet_id] of Object.entries(this.parse_packet)) {
      parse_packet_dict[packet_id] = (data) => {
        return this.parse_packet[packet_id](data, this.root_module.managers);
      };
    }
    return parse_packet_dict;
  }

  send(packet_id, data) {
    this.client.send(packet_id, data);
  }
}

module.exports = { Client };
