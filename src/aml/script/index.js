const _ = require("lodash");
const parse_instruction = require("./instruction/parse");
const { Stopwatch } = require("../../stopwatch");
const { RETURN_CODE } = require("./instruction/return_code");

const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Script {
  constructor(root, source, parent) {
    if (parent == null) throw new Error("Parent is null.");

    this._root = root;
    this._source = source;
    this._parent = parent;

    this._root_scope = parse_instruction(this, this._source.root_scope);
    this.data = JSON.parse(JSON.stringify(this._source.data));

    this._sleep_timer = {
      enabled: false,
      stopwatch: new Stopwatch(0)
    };

    this._goto_find = { enabled: false, label_name: "" };

    this._instructions_timeout_map = {};
    this._return_data_timeout_list = {};

    this.options = { debug_enabled: false };

    this._root.emit("script_initialize", this.get_name());
  }

  terminate() {
    this._root.emit("script_terminate", this.get_name());
  }

  process() {
    this._root.emit("script_process", this.get_name());

    this.print_debug();

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

  parse_return_data(data) {
    for (const [query_id, return_data_timeout] of Object.entries(
      this._return_data_timeout_list
    )) {
      if (return_data_timeout.stopwatch.is_elapsed())
        delete this._return_data_timeout_list[query_id];
    }

    const return_data_timeout = this._return_data_timeout_list[data.query_id];
    if (return_data_timeout == null) return;

    if (!return_data_timeout.stopwatch.is_elapsed())
      eval(`this.data.${return_data_timeout.key} = ${data.value}`);

    delete this._return_data_timeout_list[data.query_id];
  }

  process_api({ api, timeout, args, return_data_key }) {
    const module = this._parent.get_name();
    const query_id = this._root.generate_unique_id();

    this._return_data_timeout_list[query_id] = {
      stopwatch: new Stopwatch(timeout),
      key: return_data_key
    };

    this._root.process_api({
      module,
      query_id,
      api,
      timeout,
      args
    });
  }

  print_debug(line_number) {
    if (!this.options.debug_enabled && !this._root.options.debug_enabled)
      return;

    const program = this._root._program;
    const module = program._debug_current_module;

    logger.debug(
      `Program [${program.get_id()}/${program.get_id()}]` +
        `->Module name[${module.get_name()}/${module.get_id()}]` +
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

  _clear_return_data() {
    this._return_data_timeout_list = [];
  }
}

module.exports = Script;
