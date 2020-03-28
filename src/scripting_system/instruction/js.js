const { RETURN_CODE } = require("./return_code");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class JS {
  constructor() {
    this._id = null;
    this._fn = () => {};
  }

  process(script, root) {
    script.print_debug(`process line: ${this._id}`);

    if (script._goto_find.enabled)
      return { return_code: RETURN_CODE.PROCESSED };

    this._fn(script, root);

    return { return_code: RETURN_CODE.PROCESSED };
  }
}

module.exports = JS;
