const io = require("socket.io");
const { Util } = require("../util");
const { Connection } = require("./connection");
const log = require("simple-node-logger").createSimpleLogger();

/**
 * @description Handling sockets and connections.
 *
 * NOTE !!!
 * Don't use {connections_map} directly.
 * Connection are checked by id inside {connections_map}. Even it's undefined,
 * if id exist, then checking connection will work wrong.
 */
class Server {
  constructor({ port = 0, send_delay = 0, timeout = 3 * 1000 }) {
    this.port = port;
    this.send_delay = send_delay;
    this.timeout = timeout;

    this.parse_packet_dict = {};
    this.socket = {};
    this.connections_map = {};

    this.pending_connections_queue_async = [];
    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];
  }

  _check_connections() {
    if (this.timeout === 0) return;

    for (const [id, connection] of Object.entries(this.connections_map)) {
      let date = new Date();

      const is_timeout = date - connection.last_packet_time > this.timeout;

      if (is_timeout) {
        this._close_connection(id, "Timeout");
      } else if (!connection.socket.connected)
        this._close_connection(id, "Connection lost");
    }
  }

  _add_connection(connection) {
    this.connections_map[connection.socket.id] = connection;

    log.info("New connection:", connection.socket.id);

    for (const [packet_id] of Object.entries(this.parse_packet_dict)) {
      connection.socket.on(packet_id, data => {
        // This is async code, so we must handle it in poll
        this.pending_parse_packets_queue_async.push({
          connection_id: connection.socket.id,
          packet_id: packet_id,
          date: new Date(),
          data: data
        });
      });
    }
  }

  _close_connection(id, message) {
    if (this.get_connection_by_id(id) == null) return;

    const connection = this.get_connection_by_id(id);

    connection.on_close(connection);

    log.info(
      `[${Util.get_time_hms()}]Connection[${id}] is disconnected. Error: ` +
        message
    );

    if (connection.socket.connected) connection.socket.disconnect();
    delete this.connections_map[id];
  }

  _internal_parse_packet(connection, packet_id, data) {
    if (packet_id in this.parse_packet_dict)
      return this.parse_packet_dict[packet_id](connection, data);
    else
      this._close_connection(
        connection.socket.id,
        "Wrong packet id: " + packet_id
      );
  }

  _parse_packet({ connection_id, packet_id, date, data }) {
    let connection = this.get_connection_by_id(connection_id);
    if (this.get_connection_by_id(connection_id) == null) return;

    connection.last_packet_time = date;

    try {
      // Accept connection by server core, if not accepted yet.
      if (!connection.accepted) {
        connection.accepted = this._internal_parse_packet(
          connection,
          "accept_connection",
          data
        );

        if (!connection.accepted) {
          this._close_connection(
            connection_id,
            "Unable to accepts connection id: " + connection_id
          );
        }

        return;
      }

      // Parse packet
      this._internal_parse_packet(connection, packet_id, data);
    } catch (error) {
      log.info("Exception: " + error);
      log.info({ connection_id, packet_id, date, data });
      console.trace();
    }
  }

  send(connection_id, packet_id, data) {
    this.pending_send_packets_queue.push({
      connection_id,
      packet_id,
      data
    });
  }

  _send(socket, packet_id, data) {
    try {
      if (!socket.connected) return;

      if (this.send_delay > 0) {
        setTimeout(() => {
          socket.emit(packet_id, data);
        }, this.send_delay);
      } else {
        socket.emit(packet_id, data);
      }
    } catch (error) {
      log.info("Exception: " + error);
      log.info({ socket, packet_id, data });
      console.trace();
    }
  }

  get_connection_by_id(id) {
    if (id in this.connections_map) return this.connections_map[id];
  }

  add_parse_packet_dict(parse_packet_dict) {
    this.parse_packet_dict = {
      ...this.parse_packet_dict,
      ...parse_packet_dict
    };
  }

  start() {
    this.socket = io(this.port);

    this.socket.on("connection", socket => {
      this.pending_connections_queue_async.push(new Connection(socket));
    });
  }

  stop() {
    if (this.socket != null && Object.entries(this.socket).length !== 0) {
      this.socket.close();
      this.socket = undefined;
    }
  }

  poll() {
    this._check_connections();

    // "Async" socket.io can add new parse packet at any time
    const locked_length_parse = this.pending_parse_packets_queue_async.length;
    for (let i = 0; i < locked_length_parse; i++)
      this._parse_packet(this.pending_parse_packets_queue_async.shift());

    // Only core adds send packet, but keep length it to future changes
    const locked_length_send = this.pending_send_packets_queue.length;
    for (let i = 0; i < locked_length_send; i++) {
      const send_packet = this.pending_send_packets_queue.shift();
      if (this.get_connection_by_id(send_packet.connection_id) != null) {
        this._send(
          this.get_connection_by_id(send_packet.connection_id).socket,
          send_packet.packet_id,
          send_packet.data
        );
      }
    }

    // "Async" socket.io can add new connections at any time
    const locked_length = this.pending_connections_queue_async.length;
    for (let i = 0; i < locked_length; i++)
      this._add_connection(this.pending_connections_queue_async.shift());
  }
}

module.exports = { Server };
