const ObjectID = require("bson-objectid");
const ReturnData = require("./return_data");
const System = require("./system");
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
    this.api_map = {};
    this.data = {};
    this.ext = {};

    this._debug_enabled = false;

    this.return_data = new ReturnData();
    this.signals_event_emitter = new EventEmitter();
    this.events_event_emitter = new EventEmitter();
  }

  api(fn_full_name, script_id, query_id, timeout, args) {
    let debug_fn = "Not found api fn";
    try {
      let api = null;
      eval(`api = this.api_map.${fn_full_name}`);
      if (api == null) return;

      if ("remote_fn" in api) {
        debug_fn = api.remote_fn;
        api.remote_fn({ fn_full_name, script_id, query_id, timeout, args });
      } else if ("local_fn" in api) {
        debug_fn = api.local_fn;
        const value = api.local_fn({
          root: this,
          timeout,
          args
        });
        this.return_data.insert({ script_id, query_id, value });
      } else {
        throw new Error();
      }
    } catch (e) {
      throw new Error(
        `API - unable to call function(${e.message}): ${debug_fn.toString()}.` +
          ` Args[${JSON.stringify({
            fn_full_name,
            script_id,
            query_id,
            timeout,
            args
          })}]` +
          `ApiMap[${JSON.stringify(this.api_map)}]`
      );
    }
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
