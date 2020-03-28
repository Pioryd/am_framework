const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../src/util");
const AML = require("../../src/scripting_system/aml");

const aml_parser_json_full_name = path.join(__dirname, "aml_parser.json");
const aml_parser_directory_aml_full_name = path.join(
  __dirname,
  "aml_parser_scripts"
);

let aml_parser_json_source = null;
let aml_parser_aml_scripts_map = {};

describe("AML Parser", () => {
  before(() => {
    aml_parser_json_source = Util.read_from_json(aml_parser_json_full_name);

    for (const key of Object.keys(aml_parser_json_source)) {
      aml_parser_aml_scripts_map[key] = fs.readFileSync(
        path.join(aml_parser_directory_aml_full_name, key + ".aml"),
        "utf8",
        err => {
          if (err) throw err;
        }
      );
    }
  });
  describe("parse", () => {
    it("01", () => {
      expect(
        JSON.stringify(AML.parse(aml_parser_aml_scripts_map["01"]))
      ).to.equal(JSON.stringify(aml_parser_json_source["01"]));
    });
    it("02", () => {
      expect(
        JSON.stringify(AML.parse(aml_parser_aml_scripts_map["02"]))
      ).to.equal(JSON.stringify(aml_parser_json_source["02"]));
    });
    it("03", () => {
      expect(
        JSON.stringify(AML.parse(aml_parser_aml_scripts_map["03"]))
      ).to.equal(JSON.stringify(aml_parser_json_source["03"]));
    });
    it("04", () => {
      expect(
        JSON.stringify(AML.parse(aml_parser_aml_scripts_map["04"]))
      ).to.equal(JSON.stringify(aml_parser_json_source["04"]));
    });
  });
});
