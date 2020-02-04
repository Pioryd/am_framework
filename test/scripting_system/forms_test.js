const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Form = require("../../src/scripting_system/form");
const {
  RETURN_CODE
} = require("../../src/scripting_system/instruction/return_code");

const script_full_name = path.join(__dirname, "forms_test.json");

let root = {
  forms: {}
};

describe("Forms test", () => {
  before(() => {
    root.forms = Util.read_from_json(script_full_name);
  });
  it("First test", () => {});
});
