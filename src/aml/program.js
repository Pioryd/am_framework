const RulesManager = require("./rules_manager");
const Form = require("./form");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Program {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._running_forms = {};
    this._rules_manager = new RulesManager(
      this._root._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._root.emit("program_initialize", this.get_name());
  }

  terminate() {
    for (const form of Object.values(this._running_forms)) form.terminate();
    this._running_forms = {};
    this._rules_manager.terminate();
    this._root.emit("program_terminate", this.get_name());
  }

  process() {
    for (const form of Object.values(this._running_forms)) {
      this._debug_current_form = form;
      form.process();
    }
    this._root.emit("program_process", this.get_name());
  }

  update(data) {
    if (data.type !== "form") {
      for (const form of Object.values(this._running_forms)) form.update(data);
      return;
    }

    this._root.get_source_async(data, (source) => {
      const running_form = this._running_forms[data.name];
      if (running_form != null) {
        if (running_form.get_id() === source.id) return;
        else this._terminate_form(data.name);
      }

      this._run_form(data.name);
    });
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_form(name) {
    if (name in this._running_forms) return;

    this._root.get_source_async({ type: "form", name }, (source) => {
      try {
        this._running_forms[name] = new Form(this._root, source);
      } catch (e) {
        if (this._root.options.debug_enabled)
          logger.debug(`Unable to run form name[${name}]. \n${e}\n${e.stack}`);
      }
    });
  }

  _terminate_form(name) {
    const form = this._running_forms[name];
    if (form == null) return;

    form.terminate();
    delete this._running_forms[name];
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "form_initialize") {
        this._run_form(action_value.value);
      } else if (action_name === "form_terminate") {
        this._terminate_form(action_value.value);
      } else {
        throw new Error(
          `Unknown action[${action_name}] of program id[${this.get_id()}]`
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

module.exports = Program;
