const { RETURN_CODE } = require("./return_code");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Scope_FOR {
  constructor() {
    this.id = null;
    this._init = () => {};
    this._condition = () => {};
    this._increment = () => {};

    this._childs = [];
    this._current_child_index = -1;
    this._initialized = false;
    this._debug_info = {};
  }

  _reset() {
    this._current_child_index = -1;
    this._initialized = false;
  }

  process(script, root) {
    script.print_debug(`process Type[FOR] ID[${this.id}]`);

    // Internal:goto
    if (script._goto_find.enabled) {
      this._current_child_index = 0;
      while (this._current_child_index < this._childs.length) {
        const { return_code } = this._childs[this._current_child_index].process(
          script,
          root
        );

        if (return_code === RETURN_CODE.PROCESSED) this._current_child_index++;

        if (!script._goto_find.enabled) {
          if (this._current_child_index < this._childs.length) {
            return { return_code: RETURN_CODE.PROCESSING };
          } else {
            this._reset();
            return { return_code: RETURN_CODE.PROCESSED };
          }
        }
      }

      this._reset();
      return { return_code: RETURN_CODE.PROCESSED };
    }

    if (!this._initialized) {
      this._init(script, root);
      this._initialized = true;
      return { return_code: RETURN_CODE.PROCESSING };
    }

    if (this._current_child_index >= this._childs.length) {
      this._increment(script, root);
      this._current_child_index = -1;
      return { return_code: RETURN_CODE.PROCESSING };
    }

    if (this._current_child_index === -1) {
      if (!this._condition(script, root)) {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSED };
      } else {
        this._current_child_index = 0;
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    if (this._current_child_index < this._childs.length) {
      const child = this._childs[this._current_child_index];

      if (!script.timeout(child._timeout, child.id)) {
        this._current_child_index++;
      } else {
        const { return_code, internal } = child.process(script, root);

        if (internal === "goto") {
          this._reset();
          return { return_code: RETURN_CODE.PROCESSING };
        } else if (internal === "break") {
          this._reset();
          return { return_code: RETURN_CODE.PROCESSED };
        } else if (internal === "continue") {
          this._current_child_index = this._childs.length;
        } else if (return_code === RETURN_CODE.PROCESSED) {
          this._current_child_index++;
        } else if (return_code === RETURN_CODE.PROCESSING) {
          return { return_code: RETURN_CODE.PROCESSING };
        }
      }
    }

    return { return_code: RETURN_CODE.PROCESSING };
  }
}

module.exports = Scope_FOR;
