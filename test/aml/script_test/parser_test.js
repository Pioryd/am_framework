const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../../src/util");
const to_json = require("../../../src/aml/script/to_json");

const script_parser_json_full_name = path.join(__dirname, "parser.json");
const script_parser_directory_script_full_name = path.join(
  __dirname,
  "parser_scripts"
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
          to_json("ID_01", script_parser_script_scripts_map["Name_01"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["Name_01"]));
    });
    it("02", () => {
      expect(
        JSON.stringify(
          to_json("ID_02", script_parser_script_scripts_map["Name_02"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["Name_02"]));
    });
    it("03", () => {
      expect(
        JSON.stringify(
          to_json("ID_03", script_parser_script_scripts_map["Name_03"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["Name_03"]));
    });
    it("04", () => {
      expect(
        JSON.stringify(
          to_json("ID_04", script_parser_script_scripts_map["Name_04"])
        )
      ).to.equal(JSON.stringify(script_parser_json_source["Name_04"]));
    });
  });
});
