const { RETURN_CODE } = require("./script/instruction/return_code");
const Script = require("./script");
const RulesManager = require("./rules_manager");

class Form {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._running_scripts = {};
    this._debug_current_form = null;

    this._rules_manager = new RulesManager(
      this._root._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._root.emit("form_init", this.get_name());
  }

  terminate() {
    for (const script of Object.values(this._running_scripts))
      script.terminate();
    this._running_scripts = {};
    this._rules_manager.terminate();
  }

  process() {
    for (const script of Object.values(this._running_scripts)) {
      const return_value = script.process();

      if (return_value.return_code === RETURN_CODE.PROCESSED)
        this._terminate_script(script.get_name());
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

    this._running_scripts[name] = new Script(
      this._root,
      this._root.get_source("script", name)
    );

    this._root.emit("script_run", name);
  }

  _terminate_script(name) {
    delete this._running_scripts[name];
    this._root.emit("script_processed", name);
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
