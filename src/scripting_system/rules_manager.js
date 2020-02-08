/**
 * NOTE!
 *  Very important is [terminate()]. Not terminated have still
 *  connected listeners.
 */
class RulesManager {
  constructor(source, event_emitter, process_actions) {
    this._event_emitter = event_emitter;
    this._process_actions = process_actions;

    this._listeners_list = [];

    this._parse(source);
  }

  terminate() {
    this._remove_all_listeners();
  }

  _add_listener(name, fn) {
    this._event_emitter.on(name, fn);
    this._listeners_list.push({ name, fn });
  }

  _remove_all_listeners() {
    for (const listener of this._listeners_list)
      this._event_emitter.off(listener.name, listener.fn);

    this._listeners_list = [];
  }

  _parse(source_rules_list) {
    for (const rule of source_rules_list) {
      for (const [trigger_name, trigger_value] of Object.entries(
        rule.triggers
      )) {
        if ("min" in trigger_value && "max" in trigger_value) {
          this._add_listener(trigger_name, value => {
            if (value >= trigger_value.min && value <= trigger_value.max)
              this._process_actions(rule.actions, value);
          });
        } else if ("value" in trigger_value) {
          this._add_listener(trigger_name, value => {
            if (value === trigger_value.value)
              this._process_actions(rule.actions, value);
          });
        } else if ("any" in trigger_value) {
          this._add_listener(trigger_name, value => {
            this._process_actions(rule.actions, value);
          });
        } else {
          throw `Wrong trigger[${trigger_name}] value: ${trigger_value}` +
            ` of rule[${rule}]`;
        }
      }
    }
  }
}

module.exports = RulesManager;
