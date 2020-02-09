const ObjectID = require("bson-objectid");
const ReturnValues = require("./return_values");
const EventEmitter = require("events");

/**
 * NOTE!
 *  Very important is [terminate()]. Not terminated have still
 *  connected listeners.
 */

class Root {
  constructor() {
    this.forms = {};
    this.api = {};
    this.system = {};

    this.return_values = new ReturnValues();
    this.signals_event_emitter = new EventEmitter();
    this.events_event_emitter = new EventEmitter();
  }

  generate_unique_id() {
    return ObjectID().toHexString();
  }
}

module.exports = Root;
