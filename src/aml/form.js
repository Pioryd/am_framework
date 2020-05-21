const { RETURN_CODE } = require("./instruction/return_code");
const parse = require("./instruction/parse");
const RulesManager = require("./rules_manager");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
/**
 * NOTE!
 *  Very important is [terminate()] form. Not terminated form have still
 *  connected listeners.
 */
class Form {
  constructor(root, source) {
    this._root = root;
    this._source = source;
    this.event_emitter = this._root.event_emitter;

    if (source.id == null) throw new Error("Unable to parse form: " + source);

    this._running_scripts = {};
    this._listeners_list = [];

    this._rules_manager = new RulesManager(this.event_emitter, (...args) => {
      this._process_actions(...args);
    });
    this._rules_manager.parse(this._source.rules);

    this.event_emitter.emit("form_init", this.get_name());
  }

  terminate() {
    this._rules_manager.terminate();
    this._signals_manager.terminate();
    this._events_manager.terminate();
  }

  process() {
    // Proces running scripts
    for (const [name, script] of Object.entries(this._running_scripts)) {
      const return_value = script.process(null, this._root);
      if (return_value.return_code === RETURN_CODE.PROCESSED)
        this._terminate_script(name);
    }

    return { return_code: RETURN_CODE.PROCESSED };
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_script(name) {
    if (name in this._running_scripts) return;

    let found_source = null;
    for (const source of Object.values(this._root.source.scripts)) {
      if (name === source.name) {
        found_source = source;
        break;
      }
    }

    if (found_source === null)
      throw new Error(`Unable to run script name[${name}]`);

    this._running_scripts[name] = parse(this, found_source);

    this.event_emitter.emit("script_run", name);
  }

  _terminate_script(name) {
    delete this._running_scripts[name];
    this.event_emitter.emit("script_processed", name);
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "script_run") {
        this._run_script(action_value.value);
      } else if (action_name === "script_terminate") {
        this._terminate_script(action_value.value);
      } else if (action_name === "script_set_data") {
        this._running_scripts[action_value.script].data[
          action_value.data
        ] = value;
      } else {
        throw new Error(
          `Unknown action[${action_name}] of form ID[${this.get_id()}]`
        );
      }
    }
  }
}

module.exports = Form;
