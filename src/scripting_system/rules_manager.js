/**
 * NOTE!
 *  Very important is [terminate()]. Not terminated have still
 *  connected listeners.
 */
class Rule {
  constructor(name, event_emitter, process_actions) {
    this._name = name;
    this._event_emitter = event_emitter;

    this.process_actions = process_actions;

    this._listeners_list = [];
  }

  terminate() {
    this._remove_all_listeners();
  }

  add_listener(name, fn) {
    this._event_emitter.on(name, fn);
    this._listeners_list.push({ name, fn });
  }

  remove_all_listeners() {
    for (const listener of this._listeners_list)
      this._event_emitter.off(listener.name, listener.fn);

    this._listeners_list = [];
  }
}

class RulesManager {
  constructor() {
    this._rules = {};

    this._current_locked_trigger = { trigger_name: "", priority: 0 };
  }

  terminate() {
    for (const rule of Object.values(this._rules)) rule.terminate();
  }

  add_rule(name, event_emitter, process_actions) {
    if (name == null || event_emitter == null)
      throw `Unable to add rule[${name}]`;
    this._rules[name] = new Rule(name, event_emitter, process_actions);
  }

  remove_rule(name) {
    if (name in this._rules) {
      this._rules[name].terminate();
      delete this._rules[name];
    }
  }

  _check_trigger_priority(trigger_name, priority) {
    if (this._current_locked_trigger.trigger_name === trigger_name) {
      this._current_locked_trigger.priority = priority;
      return true;
    }
    if (this._current_locked_trigger.priority <= priority) {
      this._current_locked_trigger = { trigger_name, priority };
      return true;
    }

    return false;
  }

  parse(source_rules_list) {
    for (const rule_source of source_rules_list) {
      if (!(rule_source.type in this._rules))
        throw `Unable to parse rule. Unknown type[${rule_source.type}]`;

      const selected_rule = this._rules[rule_source.type];

      for (const trigger of rule_source.triggers) {
        const trigger_name = Object.keys(trigger)[0];
        const trigger_value = trigger[trigger_name];

        const priority =
          "priority" in trigger_value ? trigger_value.priority : 0;

        if ("min" in trigger_value && "max" in trigger_value) {
          selected_rule.add_listener(trigger_name, (value) => {
            if (value >= trigger_value.min && value <= trigger_value.max) {
              if (this._check_trigger_priority(trigger_name, priority))
                selected_rule.process_actions(rule_source.actions, value);
            } else {
              this._check_trigger_priority(trigger_name, 0);
            }
          });
        } else if ("value" in trigger_value) {
          selected_rule.add_listener(trigger_name, (value) => {
            if (value === trigger_value.value) {
              if (this._check_trigger_priority(trigger_name, priority))
                selected_rule.process_actions(rule_source.actions, value);
            } else {
              this._check_trigger_priority(trigger_name, 0);
            }
          });
        } else if ("any" in trigger_value) {
          selected_rule.add_listener(trigger_name, (value) => {
            if (this._check_trigger_priority(trigger_name, priority))
              selected_rule.process_actions(rule_source.actions, value);
          });
        } else {
          throw (
            `Wrong trigger[${trigger_name}] value: ${trigger_value}` +
            ` of rule[${rule_source}]`
          );
        }
      }
    }
  }
}

module.exports = RulesManager;
