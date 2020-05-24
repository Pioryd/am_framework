const { RETURN_CODE } = require("./return_code");

class Api {
  constructor({ id, fn }) {
    this._id = id;
    this._fn = fn || (() => {});
  }

  process(script, root) {
    script.print_debug(this._id);

    if (script._goto_find.enabled)
      return { return_code: RETURN_CODE.PROCESSED };

    this._fn(script, root);

    return { return_code: RETURN_CODE.PROCESSED };
  }
}

module.exports = Api;
