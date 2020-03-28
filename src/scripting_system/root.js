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
    this.system = null;
    this.source = { systems: {}, programs: {}, forms: {}, scripts: {} };
    this.api = {};
    this.data = {};
    this.ext = {};

    this._debug_enabled = false;

    this.return_values = new ReturnValues();
    this.signals_event_emitter = new EventEmitter();
    this.events_event_emitter = new EventEmitter();
  }

  generate_unique_id() {
    return ObjectID().toHexString();
  }

  process() {
    if (this.system != null) this.system.process();
  }

  terminate() {
    if (this.system != null) this.system.terminate();
  }

  install_system(source) {
    this.system = new System(this, source);
  }

  install_programs(programs_source) {
    this.source.programs = programs_source;
  }

  install_forms(forms_source) {
    this.source.forms = forms_source;
  }

  install_scripts(scripts_source) {
    this.source.scripts = scripts_source;
  }

  install_api(api_source) {
    this.api = { ...api_source, ...this.api };
  }

  install_data(source) {
    this.data = source;
  }

  install_ext(source) {
    this.ext = { ...this.ext, ...source };
  }
}

module.exports = Root;
