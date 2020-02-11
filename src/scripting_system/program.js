const EventEmitter = require("events");
const RulesManager = require("./rules_manager");
const Form = require("./form");

class Program {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    if (source.name == null || source.id == null)
      throw "Unable to parse program: " + source;

    this._id = source.id;
    this._name = source.name;
    this._rules = source.rules;
    this._signals = source.signals;
    this._events = source.events;
    this._forms = source.forms;

    this._current_form = null;

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

    this._event_emitter.emit("forms_count", 0);
  }

  terminate() {
    this._current_form.terminate();
    this._current_form = null;
  }

  process() {
    if (this._current_form != null) this._current_form.process();
  }

  _run_form(name) {
    if (this._current_form != null)
      if (name === this._current_form._name) return;

    let form_source = null;
    for (const form_name of this._forms) {
      if (name === form_name) {
        if (name in this._root.forms) form_source = this._root.forms[name];
        break;
      }
    }

    if (form_source == null) throw "Unable to run form: " + name;

    this._current_form = new Form(this._root, form_source);
    this._event_emitter.emit("forms_count", 1);
  }

  _terminate_form(name) {
    if (name === this._current_form._name) {
      form.terminate();
      this._current_form = null;
      this._event_emitter.emit("forms_count", 0);
    }
  }

  _process_actions(actions, value) {
    for (const [action_name, action_value] of Object.entries(actions)) {
      if (action_name === "form_run") {
        this._run_form(action_value);
      } else if (action_name === "form_terminate") {
        this._terminate_form(action_value);
      } else {
        throw `Unknown action[${action_name}] of program[${this._name}]`;
      }
    }
  }
}

module.exports = Program;
