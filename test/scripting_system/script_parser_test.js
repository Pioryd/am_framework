const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../src/util");
const Script = require("../../src/aml/script");

const script_parser_json_full_name = path.join(__dirname, "script_parser.json");
const script_parser_directory_script_full_name = path.join(
  __dirname,
  "script_parser_scripts"
);

let script_parser_json_source = null;
let script_parser_script_scripts_map = {};

describe("Script Parser", () => {
  before(() => {
    script_parser_json_source = Util.read_from_json(
      script_parser_json_full_name
    );

    for (const key of Object.keys(script_parser_json_source)) {
      script_parser_script_scripts_map[key] = fs.readFileSync(
        path.join(script_parser_directory_script_full_name, key + ".aml"),
        "utf8",
        (err) => {
          if (err) throw new Error(err);
        }
      );
    }
  });
  describe("parse", () => {
    it("01", () => {
      expect(
        JSON.stringify(
          Script.parse("01", script_parser_script_scripts_map["01"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["01"]));
    });
    it("02", () => {
      expect(
        JSON.stringify(
          Script.parse("02", script_parser_script_scripts_map["02"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["02"]));
    });
    it("03", () => {
      expect(
        JSON.stringify(
          Script.parse("03", script_parser_script_scripts_map["03"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["03"]));
    });
    it("04", () => {
      expect(
        JSON.stringify(
          Script.parse("04", script_parser_script_scripts_map["04"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["04"]));
    });
  });
});
