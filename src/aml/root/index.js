const ObjectID = require("bson-objectid");
const _ = require("lodash");
const EventEmitter = require("events");

const ReturnData = require("./return_data");
const System = require("../system");

const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Root {
  constructor() {
    this._system = null;
    this._event_emitter = new EventEmitter();

    this.return_data = new ReturnData();
    this.options = { debug_enabled: false };

    // Data set by update functions
    this._process_api = () => logger.error("Not set process_api");
    this._get_data = () => {
      return {};
    };
    this.get_source = ({ type, name }) => {
      throw new Error(`Not found source type[${type}] with name[${name}]`);
    };
    this.ext = {};
  }

  get data() {
    return this._get_data();
  }
  set data(data) {}

  generate_unique_id() {
    return ObjectID().toHexString();
  }

  process() {
    if (this._system != null) this._system.process();
  }

  terminate() {
    if (this._system != null) this._system.terminate();
  }

  emit(...args) {
    this._event_emitter.emit(...args);
  }

  update(data) {
    if (data.type !== "system" && this._system != null) {
      this._system.update(data);
    } else {
      try {
        if (this._system != null) this._system.terminate();
        this._system = new System(this, this.get_source(data));
      } catch (e) {
        if (this.options.debug_enabled)
          logger.debug(
            `Unable to run system name[${data.name}]. \n${e}\n${e.stack}`
          );
      }
    }
  }

  install_process_api(process_api_fn) {
    this._process_api = (fn_full_name, script_id, query_id, timeout, args) => {
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
    this._get_data = get_data;
  }

  install_source_getter(get_source) {
    this.get_source = get_source;
  }

  install_ext(source) {
    this.ext = _.merge(this.ext, source);
  }
}

module.exports = Root;
