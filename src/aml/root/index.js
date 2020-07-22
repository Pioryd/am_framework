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

    // TODO
    // Cleanup source_ids
    this.source_ids = { system: {}, program: {}, module: {}, script: {} };

    // Data set by update functions
    this.process_api = () => logger.error("Not set process_api");
    this._get_data = () => {
      return {};
    };
    this.get_source_async = ({ type, name }) => {
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

  update(type, source) {
    this.source_ids[type][source.name] = source.id;

    if (type !== "system") {
      if (this._system != null)
        this._system.update({ type, name: source.name });
      return;
    }

    try {
      if (this._system != null) this._system.terminate();
      this._system = new System(this, source);
    } catch (e) {
      if (this.options.debug_enabled)
        logger.debug(
          `Unable to run system name[${source.name}] id[${source.id}].` +
            ` \n${e.stack}`
        );
    }
  }

  install_process_api(process_api_fn) {
    this.process_api = (fn_full_name, aml, query_id, timeout, args) => {
      process_api_fn({
        root: this,
        fn_full_name,
        aml,
        query_id,
        timeout,
        args
      });
    };
  }

  install_data_getter(get_data) {
    this._get_data = get_data;
  }

  install_source_getter_async(get_source_async) {
    this.get_source_async = ({ type, name }, callback) => {
      const id = this.source_ids[type][name];
      if (id == null) {
        if (this.options.debug_enabled)
          logger.debug(
            `Not found id of source type[${type}] name[${name}]. ` +
              `Ids:[${JSON.stringify(this.source_ids)}]`
          );
      } else {
        get_source_async({ type, id }, callback);
      }
    };
  }

  install_ext(source) {
    this.ext = _.merge(this.ext, source);
  }
}

module.exports = Root;