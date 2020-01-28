const { RETURN_CODE } = require("./return_code");

class JS {
  constructor() {
    this._fn = () => {};
  }

  process(script, root) {
    if (script._goto_find.enabled)
      return { return_code: RETURN_CODE.PROCESSED };

    this._fn(script, root);

    return { return_code: RETURN_CODE.PROCESSED };
  }
}

module.exports = JS;
