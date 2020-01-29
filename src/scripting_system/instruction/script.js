const parse = require("./parse");
const { Stopwatch } = require("../../stopwatch");
const { RETURN_CODE } = require("./return_code");

class Script {
  constructor() {
    this._source = {};
    this._name = "";
    this._root_scope = {};
    this.data = {};

    this._sleep_timer = {
      enabled: false,
      stopwatch: new Stopwatch(0)
    };

    this._goto_find = { enabled: false, label_name: "" };

    this._debug_enabled = false;
  }

  process(script, root) {
    const current_script = script != null ? script : this;

    this.print_debug("## Script - process");

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

      if (!this._goto_find.enabled) return { return_code };
      else if (return_code === RETURN_CODE.PROCESSED)
        throw "Unable to find [goto label]";
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

  print_debug(...args) {
    if (this._debug_enabled) console.log(...args);
  }
}

module.exports = Script;
