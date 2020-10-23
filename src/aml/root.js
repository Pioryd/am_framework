const ObjectID = require("bson-objectid");
const _ = require("lodash");
const EventEmitter = require("events");

const Program = require("./program");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Root {
  constructor(process_api_fn, get_source_async) {
    if (process_api_fn == null || get_source_async == null)
      throw new Error("Not all required args are given.");

    this._program = null;
    this._event_emitter = new EventEmitter();

    this.options = { debug_enabled: false, triggers_interval: 10 };
    this.mirror = {};

    this.process_api = (data) => process_api_fn(data);
    this.get_source_async = get_source_async;

    this._event_emitter.on("aml", (aml) => this._update(aml));
  }

  generate_unique_id() {
    return ObjectID().toHexString();
  }

  process() {
    if (this._program != null) this._program.process();
  }

  terminate() {
    this._terminate_program();
  }

  emit(...args) {
    this._event_emitter.emit(...args);
  }

  update_mirror(mirror) {
    this.mirror = mirror;
    for (const [key, value] of Object.entries(this.mirror))
      this.emit(key, value);
  }

  parse_return_data(data) {
    if (this._program != null) this._program.parse_return_data(data);
  }

  _update(aml) {
    if (aml.program === "" || aml.program == null) {
      this._terminate_program();
      return;
    }

    const create_new =
      this._program == null || aml.program !== this._program.get_id();

    if (create_new) {
      try {
        this.get_source_async(
          { type: "program", id: aml.program },
          (source) => {
            if (this._program == null || this._program.get_id() !== source.id) {
              this._terminate_program();
              this._program = new Program(this, source);
            }
          }
        );
      } catch (e) {
        if (this.options.debug_enabled)
          logger.debug(
            `Unable to run program name[${source.name}] id[${source.id}].` +
              ` \n${e.stack}`
          );
      }
    } else {
      if (this._program != null) this._program.update(aml);
    }
  }

  _terminate_program() {
    if (this._program == null) return;

    this._program.terminate();
    this._program = null;
  }
}

module.exports = Root;
