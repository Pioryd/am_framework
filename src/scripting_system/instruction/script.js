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

    this._timeout_list = { instructions: {}, return_data_list: [] };
  }

  get_id() {
    return this._id;
  }

  process(script, root) {
    const current_script = script != null ? script : this;

    this.print_debug();

    if (current_script == this) this.check_return_data(current_script, root);

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
      this.clear_return_data();
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

  add_return_data({ query_id, timeout, key }) {
    this._timeout_list.return_data_list[query_id] = {
      stopwatch: new Stopwatch(timeout),
      key
    };
  }

  check_return_data(script, root) {
    const received_return_data_list = root.return_data.pop(script._id);

    for (const received_return_data of received_return_data_list) {
      const script_return_data =
        script._timeout_list.return_data_list[received_return_data.query_id];
      if (script_return_data == null) continue;

      if (!script_return_data.stopwatch.is_elapsed())
        eval(
          `this.data.${script_return_data.key} = ${received_return_data.value}`
        );

      delete script._timeout_list.return_data_list[
        received_return_data.query_id
      ];
    }
  }

  clear_return_data() {
    this._timeout_list.return_data_list = [];
  }

  print_debug(line_number) {
    if (!this._debug_enabled && !this._root._debug_enabled) return;

    const program_id = this._root.system._current_program.get_id();
    const form_id = this._root.system._current_program._current_form.get_id();

    console.log(
      `Program[${program_id}]->Form[${form_id}]->` +
        `Script[${this.get_id()}]->` +
        (line_number != null ? `Line[${line_number}]` : `start process`)
    );
  }
}

module.exports = Script;
