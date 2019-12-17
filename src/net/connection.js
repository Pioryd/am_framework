class Connection {
  constructor(socket) {
    this.last_packet_time = new Date();
    this.socket = socket;
    this.accepted = false;
    this.user_data = {};
  }
}

module.exports = { Connection };
