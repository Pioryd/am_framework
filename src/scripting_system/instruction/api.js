const { RETURN_CODE } = require("./return_code");

class Api {
  constructor() {
    this._id = null;
    this._fn = () => {};
  }

  process(script, root) {
    script.print_debug(`process Type[Api] ID[${this._id}]`);

    if (script._goto_find.enabled)
      return { return_code: RETURN_CODE.PROCESSED };

    this._fn(script, root);

    return { return_code: RETURN_CODE.PROCESSED };
  }
}

module.exports = Api;
