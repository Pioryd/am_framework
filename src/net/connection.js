class Connection {
  constructor(socket) {
    this.last_packet_time = new Date();
    this.socket = socket;
    this.accepted = false;
    this.user_data = {};
    this.on_close = () => {};
  }
}

module.exports = { Connection };
