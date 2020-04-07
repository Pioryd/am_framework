class Connection {
  constructor(socket) {
    this.last_packet_time = new Date();
    this.socket = socket;
    this.accepted = false;
    this.ext = {};
    this.on_close = () => {};
  }

  get_id() {
    if (this.socket != null) return this.socket.id;
  }
}

module.exports = { Connection };
