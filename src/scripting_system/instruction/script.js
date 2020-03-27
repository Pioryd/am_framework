const { Stopwatch } = require("../../stopwatch");
const { RETURN_CODE } = require("./return_code");

class Script {
  constructor() {
    this._root = null;
    this._id = null;
    this._name = "";
    this._root_scope = {};
    this.data = {};

    this._sleep_timer = {
      enabled: false,
      stopwatch: new Stopwatch(0)
    };

    this._goto_find = { enabled: false, label_name: "" };

    this._debug_enabled = false;

    this._timeout_list = { instructions: {}, return_values_list: [] };
  }

  get_name() {
    return this._name;
  }

  get_id() {
    this._id = null;
  }

  process(script, root) {
    const current_script = script != null ? script : this;

    this.print_debug("## Script - process");

    if (current_script == this) this.check_return_values(current_script, root);

    // Internal:sleep
    if (this._sleep_timer.enabled) {
      if (this._sleep_timer.stopwatch.is_elapsed()) {
        this._sleep_timer.enabled = false;
      } else {
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    // Internal:goto
    if (this._goto_find.enabled) {
      const { return_code } = this._root_scope.process(current_script, root);

      if (!this._goto_find.enabled) {
        return { return_code };
      } else if (return_code === RETURN_CODE.PROCESSED) {
        throw "Unable to find [goto label]";
      }
    }

    const { return_code, internal } = this._root_scope.process(
      current_script,
      root
    );

    if (internal === "goto") {
      return { return_code: RETURN_CODE.PROCESSING };
    } else if (internal === "break") {
      throw "Unable to find [break]";
    } else if (internal === "continue") {
      throw "Unable to find [continue]";
    } else if (return_code === RETURN_CODE.PROCESSED) {
      this.clear_return_values();
      return { return_code };
    } else {
      return { return_code };
    }
  }

  sleep(time) {
    this._sleep_timer.enabled = true;
    this._sleep_timer.stopwatch.reset(time);
  }

  goto(label_name) {
    this._goto_find.enabled = true;
    this._goto_find.label_name = label_name;
  }

  timeout(timeout, id) {
    if (timeout == null || timeout == 0) return true;

    if (id in this._timeout_list.instructions) {
      if (this._timeout_list.instructions[id].stopwatch.is_elapsed()) {
        delete this._timeout_list.instructions[id];
        return false;
      }
    } else {
      this._timeout_list.instructions[id] = {
        stopwatch: new Stopwatch(timeout)
      };
    }

    return true;
  }

  add_return_value(query_id, timeout) {
    this._timeout_list.return_values_list[query_id] = {
      stopwatch: new Stopwatch(timeout)
    };
  }

  check_return_values(script, root) {
    const new_return_values = root.return_values.pop(script._id);

    for (const return_value of new_return_values) {
      const { query_id, set } = return_value;

      if (query_id in script._timeout_list.return_values_list) {
        const return_value = script._timeout_list.return_values_list[query_id];
        if (!return_value.stopwatch.is_elapsed()) set(script, root);
        delete script._timeout_list.return_values_list[query_id];
      }
    }
  }

  clear_return_values() {
    this._timeout_list.return_values_list = [];
  }

  print_debug(...args) {
    if (this._debug_enabled || this._root._debug_enabled) console.log(...args);
  }
}

module.exports = Script;
