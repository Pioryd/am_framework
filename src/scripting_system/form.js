const { RETURN_CODE } = require("./instruction/return_code");
const parse = require("./instruction/parse");
const EventEmitter = require("events");
const RulesManager = require("./rules_manager");

/**
 * NOTE!
 *  Very important is [terminate()] form. Not terminated form have still
 *  connected listeners.
 */
class Form {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    if (source.name == null || source.id == null)
      throw "Unable to parse form: " + source;

    this._id = source.id;
    this._name = source.name;
    this._rules = source.rules;
    this._signals = source.signals;
    this._events = source.events;

    this._running_scripts = {};
    this._listeners_list = [];

    this._event_emitter = new EventEmitter();

    this._rules_manager = new RulesManager(
      this._rules,
      this._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._signals_manager = new RulesManager(
      this._signals,
      this._root.signals_event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._events_manager = new RulesManager(
      this._events,
      this._root.events_event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );

    this._event_emitter.emit("form_init", this._name);
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

  _run_script(name) {
    if (name in this._running_scripts) return;

    let script = null;
    for (const script_object of this._source.scripts) {
      if (script_object.name === name) {
        script = script_object;
        break;
      }
    }

    if (script == null) throw "Unable to run script: " + name;

    this._running_scripts[name] = parse(this, script);

    this._event_emitter.emit("script_run", name);
  }

  _terminate_script(name) {
    delete this._running_scripts[name];
    this._event_emitter.emit("script_processed", name);
  }

  _process_actions(actions, value) {
    for (const [action_name, action_value] of Object.entries(actions)) {
      if (action_name === "script_run") {
        this._run_script(action_value);
      } else if (action_name === "script_terminate") {
        this._terminate_script(action_value);
      } else if (action_name === "script_set_data") {
        this._running_scripts[action_value.script].data[
          action_value.data
        ] = value;
      } else {
        throw `Unknown action[${action_name}] of form[${this._name}]`;
      }
    }
  }
}

module.exports = Form;
