const ObjectID = require("bson-objectid");
const ReturnValues = require("./return_values");
const System = require("./system");
const Form = require("./form");
const EventEmitter = require("events");

/**
 * NOTE!
 *  Very important is [terminate()]. Not terminated have still
 *  connected listeners.
 */

class Root {
  constructor() {
    this.system = {};
    this.forms = {};
    this.api = {};
    this.data = {};
    this.ext = {};

    this.return_values = new ReturnValues();
    this.signals_event_emitter = new EventEmitter();
    this.events_event_emitter = new EventEmitter();
  }

  generate_unique_id() {
    return ObjectID().toHexString();
  }

  process() {
    this.system.process();
  }

  terminate() {
    this.system.terminate();
  }

  install_system(source) {
    this.system = new System(this, source);
  }

  install_forms(source) {
    for (const form of source) this.forms[form.name] = new Form(this, source);
  }

  install_api(source) {
    this.api = source;
  }

  install_data(source) {
    this.data = source;
  }

  install_ext(source) {
    this.ext = { ...this.ext, ...source };
  }
}

module.exports = Root;
