const ObjectID = require("bson-objectid");
const ReturnData = require("./return_data");
const System = require("./system");
const EventEmitter = require("events");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
/**
 * NOTE!
 *  Very important is [terminate()]. Not terminated have still
 *  connected listeners.
 */

class Root {
  constructor() {
    this.system = null;
    this.source = { systems: {}, programs: {}, forms: {}, scripts: {} };
    this.execute_api = () => logger.error("Not set execute_api");
    this.data = {};
    this.ext = {};

    this._debug_enabled = false;

    this.return_data = new ReturnData();
    this.signals_event_emitter = new EventEmitter();
    this.events_event_emitter = new EventEmitter();
  }

  api(fn_full_name, script_id, query_id, timeout, args) {
    this.execute_api({ fn_full_name, script_id, query_id, timeout, args });
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
