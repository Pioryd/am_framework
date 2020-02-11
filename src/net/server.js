const io = require("socket.io");
const { Connection } = require("./connection");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

/**
 * @description Handling sockets and connections.
 *
 * NOTE !!!
 * Don't use {connections_map} directly.
 * Connection are checked by id inside {connections_map}. Even it's undefined,
 * if id exist, then checking connection will work wrong.
 */
class Server {
  constructor({ port = 0, options, socket_io_options }) {
    this.logger = logger;

    this.port = port;
    this.options = {
      send_delay: 0,
      packet_timeout: 25 * 1000, // Not including internal ping
      ...options
    };
    this.socket_io_options = {
      pingInterval: 10 * 1000,
      pingTimeout: 5 * 1000,
      ...socket_io_options
    };

    this.socket = {};
    this.connections_map = {};

    this.pending_remove_connections_queue_async = [];
    this.pending_add_connections_queue_async = [];
    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];
  }

  _check_connections() {
    // 0 can be string, so ==
    if (this.options.packet_timeout == 0) return;

    for (const [id, connection] of Object.entries(this.connections_map)) {
      let date = new Date();

      const diff = date - connection.last_packet_time;
      const is_timeout = diff > this.options.packet_timeout;

      if (is_timeout) {
        this._close_connection(id, "Timeout: " + diff);
      } else if (!connection.socket.connected) {
        this._close_connection(id, "Connection lost");
      }
    }
  }

  _add_connection(connection) {
    if (connection == null) return;

    this.connections_map[connection.socket.id] = connection;

    logger.log(
      "New connection:",
      connection.socket.id,
      "Clients:",
      Object.keys(this.socket.clients().connected)
    );

    connection.socket.on("disconnect", () => {
      this.pending_remove_connections_queue_async.push(connection);
    });

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

    this.send(connection.socket.id, "connected", {});
  }

  _close_connection(id, message) {
    if (this.get_connection_by_id(id) == null) return;

    const connection = this.get_connection_by_id(id);

    connection.on_close(connection);

    logger.log(
      `Connection[${id}] is disconnected. Error: ` + message,
      "Clients:",
      Object.keys(this.socket.clients().connected)
    );

    if (connection.socket.connected) connection.socket.disconnect();
    delete this.connections_map[id];
  }

  _internal_parse_packet(connection, packet_id, data) {
    if (packet_id in this.parse_packet_dict) {
      logger.debug("Parse", connection.get_id(), packet_id);

      return this.parse_packet_dict[packet_id](
        connection,
        data != null ? data : {}
      );
    } else {
      this._close_connection(
        connection.socket.id,
        "Wrong packet id: " + packet_id
      );
    }
  }

  _parse_packet(packet_data) {
    if (packet_data == null) return;

    const { connection_id, packet_id, date, data } = packet_data;

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
    } catch (e) {
      logger.error(
        "Exception: ",
        {
          connection_id,
          packet_id,
          date,
          data
        },
        e,
        e.stack
      );
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

      logger.debug("Send", packet_id);

      if (this.options.send_delay > 0) {
        setTimeout(() => {
          socket.emit(packet_id, data);
        }, this.options.send_delay);
      } else {
        socket.emit(packet_id, data);
      }
    } catch (e) {
      logger.error(
        "Exception: ",
        {
          socket_id: socket.id,
          packet_id,
          data
        },
        e,
        e.stack
      );
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
    this.socket = io(this.port, this.socket_io_options);

    this.socket.on("connection", socket => {
      this.pending_add_connections_queue_async.push(new Connection(socket));
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

    // "Async" socket.io can remove connections at any time
    const locked_length_remove_connections = this
      .pending_remove_connections_queue_async.length;
    for (let i = 0; i < locked_length_remove_connections; i++)
      this.__remove_connection(
        this.pending_remove_connections_queue_async.shift()
      );

    // "Async" socket.io can add new parse packet at any time
    const locked_length_parse = this.pending_parse_packets_queue_async.length;
    for (let i = 0; i < locked_length_parse; i++)
      this._parse_packet(this.pending_parse_packets_queue_async.shift());

    // Only core adds send packet, but keep length it to future changes
    const locked_length_send = this.pending_send_packets_queue.length;
    for (let i = 0; i < locked_length_send; i++) {
      const send_packet = this.pending_send_packets_queue.shift();
      if (
        send_packet != null &&
        this.get_connection_by_id(send_packet.connection_id) != null
      ) {
        this._send(
          this.get_connection_by_id(send_packet.connection_id).socket,
          send_packet.packet_id,
          send_packet.data
        );
      }
    }

    // "Async" socket.io can add new connections at any time
    const locked_length = this.pending_add_connections_queue_async.length;
    for (let i = 0; i < locked_length; i++)
      this._add_connection(this.pending_add_connections_queue_async.shift());
  }

  __remove_connection(connection_to_remove) {
    for (const connection of Object.values(this.connections_map)) {
      if (connection_to_remove === connection_to_remove) {
        this._close_connection(connection_to_remove.get_id());
        return;
      }
    }
  }
}

module.exports = { Server };
