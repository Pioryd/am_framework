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
    this.process_api = () => logger.error("Not set process_api");
    this.get_data = () => {
      return {};
    };
    this.ext = {};

    this._debug_enabled = false;

    this.return_data = new ReturnData();
    this.event_emitter = new EventEmitter();
  }

  get data() {
    return this.get_data();
  }

  set data(new_data) {}

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

  install_api(process_api_fn) {
    this.process_api = (fn_full_name, script_id, query_id, timeout, args) => {
      process_api_fn({
        root: this,
        fn_full_name,
        script_id,
        query_id,
        timeout,
        args
      });
    };
  }

  install_data_getter(get_data) {
    this.get_data = get_data;
  }

  install_ext(source) {
    this.ext = { ...this.ext, ...source };
  }
}

module.exports = Root;
