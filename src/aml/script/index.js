const parse_instruction = require("./instruction/parse");
const { Stopwatch } = require("../../stopwatch");
const { RETURN_CODE } = require("./instruction/return_code");

class Script {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._root_scope = parse_instruction(this, this._source.root_scope);
    this.data = JSON.parse(JSON.stringify(this._source.data));

    this._sleep_timer = {
      enabled: false,
      stopwatch: new Stopwatch(0)
    };

    this._goto_find = { enabled: false, label_name: "" };
    this._timeout_list = { instructions: {}, return_data_list: [] };

    this.options = { debug_enabled: false };
  }

  process() {
    this.print_debug();

    this._check_return_data();

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
      const { return_code } = this._root_scope.process(this, this._root);

      if (!this._goto_find.enabled) {
        return { return_code };
      } else if (return_code === RETURN_CODE.PROCESSED) {
        throw new Error("Unable to find [goto label]");
      }
    }

    const { return_code, internal } = this._root_scope.process(
      this,
      this._root
    );

    if (internal === "goto") {
      return { return_code: RETURN_CODE.PROCESSING };
    } else if (internal === "break") {
      throw new Error("Unable to find [break]");
    } else if (internal === "continue") {
      throw new Error("Unable to find [continue]");
    } else if (return_code === RETURN_CODE.PROCESSED) {
      this._clear_return_data();
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

  print_debug(line_number) {
    if (!this.options.debug_enabled && !this._root.options.debug_enabled)
      return;

    const { _debug_current_program } = this._root.system;
    const { _debug_current_form } = _debug_current_program;

    console.log(
      `Program [${_debug_current_program.get_id()}` +
        `/${_debug_current_program.get_id()}]` +
        `->Form name[${_debug_current_form.get_name()}` +
        `/${_debug_current_form.get_id()}]` +
        `->Script name:[${this.get_name()}/${this.get_id()}]` +
        (line_number != null ? `Line[${line_number}]` : `start process`)
    );
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _check_return_data() {
    const received_return_data_list = this._root.return_data.pop(this.get_id());

    for (const received_return_data of received_return_data_list) {
      const script_return_data = this._timeout_list.return_data_list[
        received_return_data.query_id
      ];
      if (script_return_data == null) continue;

      if (!script_return_data.stopwatch.is_elapsed())
        eval(
          `this.data.${script_return_data.key} = ${received_return_data.value}`
        );

      delete this._timeout_list.return_data_list[received_return_data.query_id];
    }
  }

  _clear_return_data() {
    this._timeout_list.return_data_list = [];
  }
}

module.exports = Script;
