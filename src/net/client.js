const io = require("socket.io-client");
const log = require("simple-node-logger").createSimpleLogger();
const { Stopwatch } = require("../stopwatch");
class Client {
  constructor({
    url = "",
    send_delay = 0,
    timeout = 3 * 1000,
    auto_reconnect = false
  }) {
    this.url = url;
    this.send_delay = send_delay;
    this.timeout = timeout;
    this.last_packet_time = new Date();

    this.parse_packet_dict = {};
    this.socket = undefined;

    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];

    this.auto_reconnect_data = {
      enabled: auto_reconnect,
      running: false,
      stopwatch: new Stopwatch(5 * 1000)
    };
  }

  send(packet_id, data) {
    if (this.socket == null || !this.is_connected()) return;

    try {
      if (this.send_delay > 0) {
        setTimeout(() => {
          console.log(packet_id, data);
          this.socket.emit(packet_id, data);
        }, this.send_delay);
      } else this.socket.emit(packet_id, data);
    } catch (error) {
      log.info("Exception: " + error);
    }
  }

  _parse_packet({ packet_id, date, data }) {
    try {
      this.last_packet_time = date;

      if (!(packet_id in this.parse_packet_dict)) {
        log.info("Unable to parse packet id: " + packet_id);
        return;
      }

      let send_packet = this.parse_packet_dict[packet_id](data);
      if (send_packet != null)
        this.pending_send_packets_queue.push({
          packet_id: send_packet.packet_id,
          data: send_packet.data
        });
    } catch (error) {
      log.info("Exception: " + error + error.stack);
    }
  }

  _check_timeout() {
    if (this.timeout === 0) return;

    let date = new Date();

    const is_timeout = date - this.last_packet_time > this.timeout;

    if (is_timeout) {
      this.disconnect("Timeout");
    } else if (!this.socket.connected) this.disconnect("Connection lost");
  }

  add_parse_packet_dict(parse_packet_dict) {
    this.parse_packet_dict = {
      ...this.parse_packet_dict,
      ...parse_packet_dict
    };
  }

  /**
   * @description After call connect() socket need some time to change status
   *  to connected.
   */
  is_connected() {
    return this.socket != null && this.socket.connected;
  }

  connect() {
    this.socket = io(this.url);
    this.last_packet_time = new Date();

    for (const [packet_id] of Object.entries(this.parse_packet_dict)) {
      this.socket.on(packet_id, data => {
        this.pending_parse_packets_queue_async.push({
          packet_id: packet_id,
          date: new Date(),
          data: data
        });
      });
    }
  }

  disconnect(message) {
    if (this.socket == null) return;
    if (this.is_connected()) this.socket.close();

    log.info("Connection disconnected. Error:", message);
    this.socket = null;
  }

  poll() {
    if (!this.is_connected()) {
      this._auto_reconnect();
      return;
    }

    this._check_timeout();

    // "Async" socket.io can add new parse packet at any time
    const locked_length_parse = this.pending_parse_packets_queue_async.length;
    for (let i = 0; i < locked_length_parse; i++)
      this._parse_packet(this.pending_parse_packets_queue_async.shift());

    // Only core adds send packet, but keep length it to future changes
    const locked_length_send = this.pending_send_packets_queue.length;
    for (let i = 0; i < locked_length_send; i++) {
      const send_packet = this.pending_send_packets_queue.shift();
      this.send(send_packet.packet_id, send_packet.data);
    }
  }

  _auto_reconnect() {
    const ar = this.auto_reconnect_data;
    if (!ar.enabled) return;

    if (this.is_connected()) {
      ar.running = false;
      return;
    }

    if (!ar.running) {
      ar.running = true;
      ar.stopwatch.reset();
      return;
    }

    if (ar.stopwatch.is_elapsed()) {
      this.disconnect("Reconnecting...");
      this.connect();
      ar.running = false;
    }
  }
}

module.exports = { Client };
