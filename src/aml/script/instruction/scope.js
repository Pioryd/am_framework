const { RETURN_CODE } = require("./return_code");

class Scope {
  constructor({ id, childs }) {
    this._id = id;
    this._childs = childs || [];

    this._current_child_index = 0;
  }

  _reset() {
    this._current_child_index = 0;
  }

  process(script, root) {
    script.print_debug(this._id);

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

    if (this._current_child_index < this._childs.length) {
      const child = this._childs[this._current_child_index];

      const { return_code, internal } = child.process(script, root);

      if (
        internal === "goto" ||
        internal === "break" ||
        internal === "continue"
      ) {
        this._reset();
        return { return_code: RETURN_CODE.PROCESSING, internal };
      } else if (return_code === RETURN_CODE.PROCESSED) {
        this._current_child_index++;
      } else if (return_code === RETURN_CODE.PROCESSING) {
        return { return_code };
      }
    }

    if (this._current_child_index < this._childs.length) {
      return { return_code: RETURN_CODE.PROCESSING };
    } else {
      this._reset();
      return { return_code: RETURN_CODE.PROCESSED };
    }
  }
}

module.exports = Scope;
