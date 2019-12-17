const io = require("socket.io");
const { Util } = require("../util");
const { Connection } = require("./connection");

/**
 * @description Handling sockets and connections.
 */
class Server {
  constructor({ port = 0, send_delay = 0, timeout = 3 * 1000 }) {
    this.port = port;
    this.timeout = timeout;

    this.parse_packet_dict = {};
    this.socket = {};
    this.connections_map = {};

    this.pending_connections_queue_async = [];
    this.pending_parse_packets_queue_async = [];
    this.pending_send_packets_queue = [];
  }

  _check_connections() {
    for (const [socket_id, connection] of Object.entries(
      this.connections_map
    )) {
      let date = new Date();

      const is_timeout = date - connection.last_packet_time > this.timeout;

      if (is_timeout) {
        this._close_connection(socket_id, "Timeout");
      } else if (!connection.socket.connected)
        this._close_connection(socket_id, "Connection lost");
    }
  }

  _add_connection(connection) {
    this.connections_map[connection.socket.id] = connection;

    console.log("New connection:", connection.socket.id);

    for (const [packet_id] of Object.entries(this.parse_packet_dict)) {
      connection.socket.on(packet_id, data => {
        // This is async code, so we must handle it in poll
        this.pending_parse_packets_queue_async.push({
          socket_id: connection.socket.id,
          packet_id: packet_id,
          date: new Date(),
          data: data
        });
      });
    }
  }

  _close_connection(id, message) {
    console.log(
      `[${Util.get_time_hms()}]Connection[${id}] is disconnected. Error: ` +
        message
    );
    if (id in this.connections_map) {
      if (this.connections_map[id].socket.connected)
        this.connections_map[id].socket.disconnect();
      delete this.connections_map[id];
    }
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

  _parse_packet({ socket_id, packet_id, date, data }) {
    let connection = undefined;
    if (socket_id in this.connections_map)
      connection = this.connections_map[socket_id];
    else return;

    connection.last_packet_time = date;

    try {
      // Accept connection by server core, if not accepted yet.
      if (!connection.accepted) {
        const send_packet = this._internal_parse_packet(
          connection,
          "accept_connection",
          data
        );

        if (send_packet !== undefined) {
          connection.accepted = true;
          this._send(
            connection.socket,
            send_packet.packet_id,
            send_packet.data
          );
        } else {
          this._close_connection(
            socket_id,
            "Unable to accepts connection id: " + socket_id
          );
        }

        return;
      }
      // Parse packet
      const send_packet = this._internal_parse_packet(
        socket_id,
        packet_id,
        data
      );
      // Push to send packet
      if (send_packet !== undefined && send_packet !== null) {
        this.pending_send_packets_queue.push({
          socket_id: socket_id,
          packet_id: send_packet.packet_id,
          data: send_packet.data
        });
      }
    } catch (error) {
      console.log("Exception: " + error);
    }
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
      console.log("Exception: " + error);
    }
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
    if (Object.entries(this.socket).length !== 0) {
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
      if (send_packet.socket_id in this.connections_map) {
        this._send(
          this.connections_map[send_packet.socket_id].socket,
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
