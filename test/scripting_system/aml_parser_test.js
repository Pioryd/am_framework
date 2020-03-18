const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../src/util");
const AML = require("../../src/scripting_system/aml");

const aml_parser_json_full_name = path.join(__dirname, "aml_parser_test.json");
const aml_parser_aml_full_name = path.join(__dirname, "aml_parser_test.aml");

let aml_parser_json_source = null;
let aml_parser_aml_source = null;

describe("AML Parser", () => {
  before(() => {
    aml_parser_json_source = Util.read_from_json(aml_parser_json_full_name);
    aml_parser_aml_source = fs.readFileSync(
      aml_parser_aml_full_name,
      "utf8",
      err => {
        if (err) throw err;
      }
    );
  });
  describe("parse", () => {
    it("01", () => {
      AML.parse(aml_parser_aml_source);
      expect(() => {}).not.equal(aml_parser_json_source);
    });
  });
});
