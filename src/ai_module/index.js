const Queue = require("./queue.js");
const EventEmitter = require("events");

class AI_Module {
  constructor({ mirror, process_world_fn }) {
    this.event_emitter = new EventEmitter();
    this._queue_packets = new Queue();
    this.sockets = {};
    this.api = {};
    this.data = {};
    this.mirror = mirror;
    this.process_world_fn = process_world_fn;
  }

  initialize() {
    this.event_emitter.emit("initialize");
  }

  terminate() {
    this.event_emitter.emit("terminate");
  }

  poll() {
    this._parse_packet();
    this.event_emitter.emit("poll");
  }

  push(socket, api, data) {
    this._queue_packets.out_push({ socket, api, data });
  }

  pop() {
    return this._queue_packets.in_pop();
  }

  _ext_push(socket, api, data) {
    this._queue_packets.in_push({ socket, api, data });
  }

  _ext_pop() {
    return this._queue_packets.out_pop();
  }

  install(api, sockets) {
    this.api = api;
    this.sockets = sockets;
  }

  process_api(api, data) {
    if (api in this.api) this.api[api](this, data);
  }

  _parse_packet = () => {
    const packet = this.pop();
    if (packet == null) return false;

    try {
      if (packet.api == null) this.event_emitter.emit("data", packet.data);
      else this.process_api(packet.api, packet.data);
    } catch (e) {
      throw new Error(
        `Unable to process packet[${JSON.stringify(packet)}]. ${e.stack}`
      );
    }

    return true;
  };
}

module.exports = AI_Module;
