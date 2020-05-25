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

    this._root.emit("forms_count", Object.values(this._running_forms).length);
  }

  terminate() {
    for (const form of Object.values(this._running_forms)) form.terminate();
    this._running_forms = {};
    this._rules_manager.terminate();
  }

  process() {
    for (const form of Object.values(this._running_forms)) {
      this._debug_current_form = form;
      form.process();
    }
    this._root.emit("forms_count", Object.values(this._running_forms).length);
  }

  update(data) {
    if (data.type !== "form") {
      for (const form of Object.values(this._running_forms)) form.update(data);
      return;
    }

    const source = this._root.get_source(data);

    const running_form = this._running_forms[data.name];
    if (running_form != null) {
      if (running_form.get_id() === source.id) return;
      else this._terminate_form(data.name);
    }

    this._run_form(data.name);
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_form(name) {
    if (name in this._running_forms) return;

    try {
      if (!this._source.forms.includes(name))
        throw new Error(
          `AML:Program[${this._source.id}] do not contains AML:Form name[${name}]`
        );

      this._running_forms[name] = new Form(
        this._root,
        this._root.get_source({ type: "form", name })
      );

      this._root.emit("forms_count", Object.values(this._running_forms).length);
    } catch (e) {
      if (this._root.options.debug_enabled)
        logger.debug(`Unable to run form name[${name}]. \n${e}\n${e.stack}`);
    }
  }

  _terminate_form(name) {
    const form = this._running_forms[name];
    if (form == null) return;

    form.terminate();
    delete this._running_forms[name];

    this._root.emit("forms_count", Object.values(this._running_forms).length);
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "form_run") {
        this._run_form(action_value.value);
      } else if (action_name === "form_terminate") {
        this._terminate_form(action_value.value);
      } else {
        throw new Error(
          `Unknown action[${action_name}] of AML:Program id[${this.get_id()}]`
        );
      }
    }
  }
}

module.exports = Program;
