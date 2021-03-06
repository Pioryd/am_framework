const { RETURN_CODE } = require("./return_code");

class Scope_IF {
  constructor({ id, conditions }) {
    this._id = id;
    this._conditions = conditions || [];

    this._selected_condition_index = -1;
    this._current_child_index = 0;
  }

  _reset() {
    this._selected_condition_index = -1;
    this._current_child_index = 0;
  }

  process(script, root) {
    script.print_debug(this._id);

    // Internal:goto
    if (script._goto_find.enabled) {
      for (
        this._selected_condition_index = 0;
        this._selected_condition_index < this._conditions.length;
        this._selected_condition_index++
      ) {
        const { childs } = this._conditions[this._selected_condition_index];
        this._current_child_index = 0;

        while (this._current_child_index < childs.length) {
          const { return_code } = childs[this._current_child_index].process(
            script,
            root
          );
          if (return_code === RETURN_CODE.PROCESSED)
            this._current_child_index++;

          if (!script._goto_find.enabled) {
            if (this._current_child_index < childs.length) {
              return { return_code: RETURN_CODE.PROCESSING };
            } else {
              this._reset();
              return { return_code: RETURN_CODE.PROCESSED };
            }
          }
        }
      }

      this._reset();
      return { return_code: RETURN_CODE.PROCESSED };
    }

    if (this._selected_condition_index === -1) {
      for (let i = 0; i < this._conditions.length; i++) {
        if (
          this._conditions[i].fn(script, script.data, script._root.mirror, root)
        ) {
          this._selected_condition_index = i;
          return { return_code: RETURN_CODE.PROCESSING };
        }
      }

      return { return_code: RETURN_CODE.PROCESSED };
    }

    const { childs } = this._conditions[this._selected_condition_index];

    if (this._current_child_index < childs.length) {
      const child = childs[this._current_child_index];

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
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    if (this._current_child_index < childs.length) {
      return { return_code: RETURN_CODE.PROCESSING };
    } else {
      this._reset();
      return { return_code: RETURN_CODE.PROCESSED };
    }
  }
}

module.exports = Scope_IF;
