const { RETURN_CODE } = require("./return_code");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

/**
 * Commands:
 *    - must be lower case.
 *    - works only in current script
 *
 * List:
 *    - [break] and [continue]
 *      - Works for [Scope_WHILE] and [Scope_FOR].
 *    - [label label_name ] and [goto label_name]
 *      - [All scopes]
 *        - set child_index at found label
 *      - [Scope_FOR]
 *        - Do NOT init loop.
 *    - [sleep time_in_milliseconds]
 *      - Start counting on called in script
 */
class Internal {
  constructor() {
    this.id = null;
    this._command = "";
    this._arg = "";
  }

  process(script, root) {
    script.print_debug(`process Type[Internal] ID[${this.id}]`);

    if (script._goto_find.enabled) {
      if (
        this._command === "label" &&
        this._arg === script._goto_find.label_name
      ) {
        script._goto_find.enabled = false;
      }

      return { return_code: RETURN_CODE.PROCESSED };
    }

    if (this._command === "sleep") {
      script.sleep(this._arg);
    } else if (this._command === "goto") {
      script.goto(this._arg);
    }

    return { return_code: RETURN_CODE.PROCESSED, internal: this._command };
  }
}

module.exports = Internal;
