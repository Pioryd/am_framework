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
    this.event_emitter = this._root.event_emitter;

    if (source.id == null)
      throw new Error("Unable to parse program: " + source);

    this._current_form = null;

    this._rules_manager = new RulesManager(this.event_emitter, (...args) => {
      this._process_actions(...args);
    });

    this._rules_manager.parse(this._source.rules);

    this.event_emitter.emit("forms_count", 0);
  }

  terminate() {
    this._current_form.terminate();
    this._current_form = null;
  }

  process() {
    if (this._current_form != null) {
      this._current_form.process();
    } else {
      this.event_emitter.emit("forms_count", 0);
    }
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_form(name) {
    if (this._current_form != null)
      if (name === this._current_form._source.name) return;

    let found_source = null;
    for (const source of Object.values(this._root.source.forms)) {
      if (name === source.name) {
        found_source = source;
        break;
      }
    }
    if (found_source === null)
      throw new Error(`Program[${this._source.id}] not found form[${name}]`);

    if (!this._source.forms.includes(name))
      throw new Error(
        `Program[${this._source.id}] do not contains form[${name}]`
      );

    this._current_form = new Form(this._root, found_source);
    this.event_emitter.emit("forms_count", 1);
  }

  _terminate_form(name) {
    if (name === this._current_form._source.name) {
      form.terminate();
      this._current_form = null;
      this.event_emitter.emit("forms_count", 0);
    }
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
          `Unknown action[${action_name}] of program[${this.get_id()}]`
        );
      }
    }
  }
}

module.exports = Program;
