const { RETURN_CODE } = require("./return_code");

class Scope_WHILE {
  constructor({ id, condition, childs }) {
    this._id = id;
    this._condition = condition || (() => {});
    this._childs = childs || [];

    this._current_child_index = -1;
  }

  _reset() {
    this._current_child_index = -1;
  }

  process(script, root) {
    script.print_debug(this._id);

    // Internal:goto
    if (script._goto_find.enabled) {
      this._current_child_index = 0;
      while (this._current_child_index < this._childs.length) {
        const child = this._childs[this._current_child_index];
        const { return_code } = child.process(script, root);

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

    if (this._current_child_index === -1) {
      this._current_child_index = 0;
      if (!this._condition(script, script.data, script._root.mirror, root)) {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSED };
      } else {
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    if (this._current_child_index < this._childs.length) {
      const child = this._childs[this._current_child_index];

      const { return_code, internal } = child.process(script, root);

      if (internal === "goto") {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSING };
      } else if (internal === "break") {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSED };
      } else if (internal === "continue") {
        this._current_child_index = -1;
      } else if (return_code === RETURN_CODE.PROCESSED) {
        this._current_child_index++;
      } else if (return_code === RETURN_CODE.PROCESSING) {
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    if (this._current_child_index >= this._childs.length)
      this._current_child_index = -1;

    return { return_code: RETURN_CODE.PROCESSING };
  }
}

module.exports = Scope_WHILE;
