const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");
const System = require("../../src/aml/system");

const system_full_name = path.join(__dirname, "system_test.json");

let system_test_json = {};
let source = {};

const root = new Root();

describe("System test", () => {
  before(() => {
    const override_root = () => {
      root.get_source_async = ({ type, name }, callback) => {
        if (type === "system") callback(source.systems[name]);
        else if (type === "program") callback(source.programs[name]);
      };
      root._get_data = () => {
        return {
          aml: {
            ID_Test_system: {
              ID_Test_program: {}
            }
          }
        };
      };
    };

    override_root();

    system_test_json = Util.read_from_json(system_full_name);
    source.systems = system_test_json.systems;
    source.programs = system_test_json.programs;
  });
  it("Parse", () => {
    const system = new System(root, source.systems["Name_Test_system"]);

    expect(system.get_id()).to.equal("ID_Test_system");
    expect(Object.values(system._running_programs).length).to.equal(1);
  });
});
