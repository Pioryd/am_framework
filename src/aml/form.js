const { RETURN_CODE } = require("./script/instruction/return_code");
const Script = require("./script");
const script_to_json = require("./script/to_json");
const RulesManager = require("./rules_manager");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

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
      this._terminate_script(script.get_name());

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

  update(data) {
    if (data.type !== "script") {
      for (const script of Object.values(this._running_scripts))
        script.update(data);
      return;
    }

    this._root.get_source_async(data, (source) => {
      const running_script = this._running_scripts[data.name];
      if (running_script != null) {
        if (running_script.get_id() === source.id) return;
        else this._terminate_script(data.name);
      }

      this._run_script(data.name);
    });
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_script(name) {
    if (name in this._running_scripts) return;

    this._root.get_source_async({ type: "script", name }, (source) => {
      try {
        this._running_scripts[name] = new Script(this._root, source);

        this._root.emit("script_run", name);
      } catch (e) {
        if (this._root.options.debug_enabled)
          logger.debug(
            `Unable to run script name[${name}]. \n${e}\n${e.stack}`
          );
      }
    });
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

      if (this._root.options.debug_enabled) {
        logger.debug(
          `Action [${action_name}] -> [${JSON.stringify(action_value)}]`
        );
      }
    }
  }
}

module.exports = Form;
