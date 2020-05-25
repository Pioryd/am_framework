class RulesManager {
  constructor(event_emitter, process_actions) {
    this.event_emitter = event_emitter;
    this.process_actions = process_actions;
    this._listeners_list = [];

    this._current_locked_trigger = { trigger_name: "", priority: 0 };
  }

  terminate() {
    this.remove_all_listeners();
  }

  add_listener(name, fn) {
    this.event_emitter.on(name, fn);
    this._listeners_list.push({ name, fn });
  }

  remove_all_listeners() {
    for (const listener of this._listeners_list)
      this.event_emitter.off(listener.name, listener.fn);

    this._listeners_list = [];
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
      for (const trigger of rule_source.triggers) {
        const trigger_name = Object.keys(trigger)[0];
        const trigger_value = trigger[trigger_name];

        const priority =
          "priority" in trigger_value ? trigger_value.priority : 0;

        if ("min" in trigger_value && "max" in trigger_value) {
          this.add_listener(trigger_name, (value) => {
            if (value >= trigger_value.min && value <= trigger_value.max) {
              if (this._check_trigger_priority(trigger_name, priority))
                this.process_actions(rule_source.actions, value);
            } else {
              this._check_trigger_priority(trigger_name, 0);
            }
          });
        } else if ("value" in trigger_value) {
          this.add_listener(trigger_name, (value) => {
            if (value === trigger_value.value) {
              if (this._check_trigger_priority(trigger_name, priority))
                this.process_actions(rule_source.actions, value);
            } else {
              this._check_trigger_priority(trigger_name, 0);
            }
          });
        } else if ("any" in trigger_value) {
          this.add_listener(trigger_name, (value) => {
            if (this._check_trigger_priority(trigger_name, priority))
              this.process_actions(rule_source.actions, value);
          });
        } else {
          throw new Error(
            `Wrong trigger[${trigger_name}] value: ${trigger_value}` +
              ` of rule[${rule_source}]`
          );
        }
      }
    }
  }
}

module.exports = RulesManager;
