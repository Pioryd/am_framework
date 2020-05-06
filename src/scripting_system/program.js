const EventEmitter = require("events");
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

    if (source.id == null)
      throw new Error("Unable to parse program: " + source);

    this._current_form = null;

    this._event_emitter = new EventEmitter();

    this._rules_manager = new RulesManager();

    this._rules_manager.add_rule("system", this._event_emitter, (...args) => {
      this._process_actions(...args);
    });
    this._rules_manager.add_rule(
      "signal",
      this._root.signals_event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.add_rule(
      "event",
      this._root.events_event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._event_emitter.emit("forms_count", 0);
  }

  terminate() {
    this._current_form.terminate();
    this._current_form = null;
  }

  process() {
    if (this._current_form != null) {
      this._current_form.process();
    } else {
      this._event_emitter.emit("forms_count", 0);
    }
  }

  get_id() {
    return this._source.id;
  }

  _run_form(id) {
    if (this._current_form != null)
      if (id === this._current_form.get_id()) return;

    if (!(id in this._root.source.forms))
      throw new Error(`Program[${this._source.id}] not found form[${id}]`);
    if (!this._source.forms.includes(id))
      throw new Error(
        `Program[${this._source.id}] do not contains form[${id}]`
      );

    this._current_form = new Form(this._root, this._root.source.forms[id]);
    this._event_emitter.emit("forms_count", 1);
  }

  _terminate_form(id) {
    if (id === this._current_form.get_id()) {
      form.terminate();
      this._current_form = null;
      this._event_emitter.emit("forms_count", 0);
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
