const { RETURN_CODE } = require("./instruction/return_code");
const parse = require("./instruction/parse");
const EventEmitter = require("events");

class Form {
  constructor(root, source) {
    this.id = null;
    this._source = source;
    this._name = "";
    this._rules = [];
    this._signals = [];
    this._events = [];
    this._running_scripts = {};

    this.root = root;
    this.event_emitter = new EventEmitter();

    this._parse();
    this.event_emitter.emit("form_init");
  }

  process(root) {
    // Proces running scripts
    for (const [name, script] of Object.entries(this._running_scripts)) {
      const return_value = script.process(null, root);
      if (return_value.return_code === RETURN_CODE.PROCESSED) {
        delete this._running_scripts[name];
        this.event_emitter.emit("script_processed", name);
      }
    }

    return { return_code: RETURN_CODE.PROCESSED };
  }

  _run_script(name) {
    if (name in this._running_scripts) return;

    const script = Object.entries(this._source.scripts)[name];
    if (script == null) throw "Unable to run script: " + name;

    this._running_scripts[name] = parse(script);

    this.event_emitter.emit("script_run", name);
  }

  _parse() {
    const source = this._source;
    if (source.name == null || source.id == null)
      throw "Unable to parse form: " + source;

    this.id = source.id;
    this._name = source.name;
    this._rules = source.rules;
    this._signals = source.signals;
    this._events = source.events;

    const process_actions = actions => {
      for (const [action_name, action_value] of Object.entries(actions)) {
        if (action_name === "script_run") {
          this._run_script(action_value);
        }
      }
    };

    for (const rule of this._rules) {
      for (const [trigger_name, trigger_value] of Object.entries(
        rule.triggers
      )) {
        const internal_rules = ["form_init", "script_run"];
        if (internal_rules.includes(trigger_name)) {
          this.event_emitter.on(trigger_name, value => {
            if (value > trigger_value) process_actions(rule.actions);
          });
        } else {
          this.root.rules_event_emitter.on(trigger_name, value => {
            if (value > trigger_value) process_actions(rule.actions);
          });
        }
      }
    }

    for (const signal of this._signals) {
      for (const [trigger_name, trigger_value] of Object.entries(
        signal.triggers
      )) {
        if ("min" in trigger_value && "max" in trigger_value) {
          this.root.signals_event_emitter.on(trigger_name, value => {
            if (value > trigger_value.min && value < trigger_value.min)
              process_actions(signal.actions);
          });
        } else if ("value") {
          this.root.signals_event_emitter.on(trigger_name, value => {
            if (value === trigger_value.value) process_actions(signal.actions);
          });
        } else {
          throw `Wrong trigger[${trigger_name}] value: ${trigger_value}` +
            ` of signal[${signal}]`;
        }
      }
    }

    for (const event of this._events) {
      for (const [trigger_name, trigger_value] of Object.entries(
        event.triggers
      )) {
        if ("min" in trigger_value && "max" in trigger_value) {
          this.root.events_event_emitter.on(trigger_name, value => {
            if (value > trigger_value.min && value < trigger_value.min)
              process_actions(event.actions);
          });
        } else if ("value") {
          this.root.events_event_emitter.on(trigger_name, value => {
            if (value === trigger_value.value) process_actions(event.actions);
          });
        } else {
          throw `Wrong trigger[${trigger_name}] value: ${trigger_value}` +
            ` of event[${event}]`;
        }
      }
    }
  }
}

module.exports = Form;
