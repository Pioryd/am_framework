const { RETURN_CODE } = require("./return_code");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Scope_WHILE {
  constructor() {
    this.id = null;
    this._condition = () => {};
    this._childs = [];
    this._current_child_index = 0;
    this._debug_info = {};
  }

  _reset() {
    this._current_child_index = 0;
  }

  process(script, root) {
    logger.debug(`process Type[WHILE] ID[${this.id}]`);

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

    if (this._current_child_index === 0)
      if (!this._condition(script, root)) {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSED };
      } else {
        return { return_code: RETURN_CODE.PROCESSING };
      }

    if (this._current_child_index < this._childs.length) {
      const { return_code, internal } = this._childs[
        this._current_child_index
      ].process(script, root);

      if (internal === "goto") {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSING };
      } else if (internal === "break") {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSED };
      } else if (internal === "continue") {
        this._current_child_index = 0;
      } else if (return_code === RETURN_CODE.PROCESSED) {
        this._current_child_index++;
      } else if (return_code === RETURN_CODE.PROCESSING) {
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    if (this._current_child_index >= this._childs.length)
      this._current_child_index = 0;

    return { return_code: RETURN_CODE.PROCESSING };
  }
}

module.exports = Scope_WHILE;
