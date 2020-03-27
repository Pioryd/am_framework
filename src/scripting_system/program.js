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

    if (source.name == null || source.id == null)
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

  get_name() {
    return this._source.name;
  }

  _run_form(name) {
    if (this._current_form != null)
      if (name === this._current_form.get_name()) return;

    let form_source = null;

    for (const id of this._source.forms) {
      if (!(id in this._root.source.forms))
        throw new Error(`Program[${this._source.id}] not found form[${id}]`);

      if (name === this._root.source.forms[id].name) {
        form_source = this._root.source.forms[id];
        break;
      }
    }

    if (form_source == null) {
      logger.error(`Unable to run form[${name}]. Source[${form_source}]`);
      return;
    }

    this._current_form = new Form(this._root, form_source);
    this._event_emitter.emit("forms_count", 1);
  }

  _terminate_form(name) {
    if (name === this._current_form.get_name()) {
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
          `Unknown action[${action_name}] of program[${this.get_name()}]`
        );
      }
    }
  }
}

module.exports = Program;
