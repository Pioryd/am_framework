const io = require("socket.io-client");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Stopwatch } = require("../stopwatch");

/**
 * Socket.io reconnect system is broken. For that reason this class
 * is using own reconnect.
 */
class Client {
  constructor({ options = {}, socket_io_options = {} }) {
    this.logger = logger;

    this.options = {
      send_delay: 0,
      packet_timeout: 25 * 1000, // Not including internal ping
      ...options
    };
    this.socket_io_options = {
      reconnection: false,
      timeout: 20 * 1000,
      forceNew: false,
      ...socket_io_options
    };

    this.last_packet_time = new Date();
    this.parse_packet_dict = {};
    this.socket = null;

    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];

    this.auto_reconnect_data = {
      enabled: true,
      running: false,
      stopwatch: new Stopwatch(5 * 1000)
    };

    // Events for debugging
    this._socket_io_events = {
      connect: () => {},
      connect_error: error => {},
      connect_timeout: timeout => {},
      error: error => {},
      disconnect: reason => {
        this.events.disconnected();
      },
      // This class don't use socket.io reconnect
      // // reconnect: attemptNumber => {},
      // // reconnect_attempt: attemptNumber => {},
      // // reconnecting: attemptNumber => {},
      // // reconnect_error: error => {},
      // // reconnect_failed: () => {},
      ping: () => {},
      pong: latency => {}
    };

    this.events = {
      connected: () => {},
      disconnected: () => {},
      reconnecting: () => {}
    };
  }

  send(packet_id, data) {
    if (this.socket == null || !this.is_connected()) return;

    this.pending_send_packets_queue.push({
      packet_id,
      data
    });
  }

  _send(packet_id, data) {
    if (this.socket == null || !this.is_connected()) return;

    logger.debug("Send", packet_id);

    try {
      if (this.options.send_delay > 0) {
        setTimeout(() => {
          this.socket.emit(packet_id, data);
        }, this.options.send_delay);
      } else this.socket.emit(packet_id, data);
    } catch (e) {
      logger.error(e, e.stack);
    }
  }

  _parse_packet({ packet_id, date, data }) {
    try {
      this.last_packet_time = date;

      if (!(packet_id in this.parse_packet_dict)) {
        logger.log("Unable to parse packet id: " + packet_id);
        return;
      }

      logger.debug("Parse", packet_id);

      this.parse_packet_dict[packet_id](data != null ? data : {});
    } catch (e) {
      logger.error(
        "Exception:",
        { packet_id, date, data },
        this.parse_packet_dict,
        e,
        e.stack
      );
    }
  }

  _check_timeout() {
    // 0 can be string, so ==
    if (this.options.packet_timeout == 0) return;

    let date = new Date();

    const diff = date - this.last_packet_time;
    const is_timeout = diff > this.options.packet_timeout;

    if (is_timeout) {
      this.disconnect("Timeout: " + diff);
    } else if (!this.socket.connected) {
      this.disconnect("Connection lost");
    }
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
    this.socket = io(this.options.url, this.socket_io_options);
    this.last_packet_time = new Date();

    for (const [event_id, event_fun] of Object.entries(
      this._socket_io_events
    )) {
      this.socket.on(event_id, (...args) => {
        logger.debug("_socket_io_events", event_id, ...args);
        event_fun(...args);
      });
    }

    this.socket.on("connected", (...args) => {
      logger.debug("this.socket.on('connected')");
      this.events.connected(...args);
    });

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

    logger.log("Connection disconnected. Error:", message);

    if (this.is_connected()) this.socket.close();

    this.socket.removeAllListeners();
    this.socket = null;
    this.last_packet_time = new Date();
    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];
  }

  poll() {
    // "Async" socket.io can add new parse packet at any time
    const locked_length_parse = this.pending_parse_packets_queue_async.length;
    for (let i = 0; i < locked_length_parse; i++)
      this._parse_packet(this.pending_parse_packets_queue_async.shift());

    if (!this.is_connected()) {
      this._auto_reconnect();
      return;
    }

    this._check_timeout();

    // Only core adds send packet, but keep length it to future changes
    const locked_length_send = this.pending_send_packets_queue.length;
    for (let i = 0; i < locked_length_send; i++) {
      const send_packet = this.pending_send_packets_queue.shift();
      this._send(send_packet.packet_id, send_packet.data);
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
      this.events.reconnecting();
      this.disconnect("Reconnecting...");
      this.connect();
      ar.running = false;
    }
  }
}

module.exports = { Client };
