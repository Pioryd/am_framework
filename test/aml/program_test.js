const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");
const Program = require("../../src/aml/program");

const programs_full_name = path.join(__dirname, "program_test.json");

let source = {};
const root = new Root();

function get_module_parents() {
  return {
    get_id: () => {
      return "system_id";
    }
  };
}

describe("Program test", () => {
  before(() => {
    const override_root = () => {
      root.get_source_async = ({ type, name }, callback) => {
        if (type === "module") callback(source.modules[name]);
        else if (type === "program") callback(source.programs[name]);
      };
      root._get_data = () => {
        return {
          aml: {
            system_id: {
              ID_Test_1: {
                ID_Test_module_1: {},
                ID_Test_module_2: {}
              }
            }
          }
        };
      };
    };

    override_root();

    const program_test_json = Util.read_from_json(programs_full_name);
    source.modules = program_test_json.modules;
    source.programs = program_test_json.programs;
  });
  it("Parse", () => {
    const program = new Program(
      root,
      source.programs["ID_Test_1"],
      get_module_parents()
    );

    expect(program.get_id()).to.equal("ID_Test_1");
    expect(program._source.rules.length).to.equal(4);
  });
});
