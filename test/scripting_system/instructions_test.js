const { expect, config } = require("chai");
const path = require("path");
const Form = require("../../src/scripting_system/form");
const {
  RETURN_CODE
} = require("../../src/scripting_system/instruction/return_code");

const script_full_name = path.join(__dirname, "form.json");

let root = {
  forms: {}
};

describe("Form test", () => {
  before(() => {
    root.forms = Util.read_from_json(script_full_name);
  });
  it("First test", () => {
    const script = parse(root, root.scripts["Test_js"]);
    expect(script.data.val).to.equal(0);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.equal(1);
  });
});
