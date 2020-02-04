const { RETURN_CODE } = require("./instruction/return_code");

class Form {
  constructor() {
    this.id = null;
  }

  process(root) {
    script.print_debug(`process Type[Form] ID[${this.id}]`);
    return { return_code: RETURN_CODE.PROCESSED };
  }
}

module.exports = Form;
