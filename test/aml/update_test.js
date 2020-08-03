const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");

const DEBUG_ENABLED = false;
const source_full_name = path.join(__dirname, "update_test.json");

let source = {};
const object_data = { aml: {} };
const create_root = () => {
  const root = new Root();
  root.options.debug_enabled = DEBUG_ENABLED;
  root.install_source_getter_async(({ type, id }, callback) => {
    callback(source[type][id]);
  });
  root._get_data = () => {
    return object_data;
  };
  return root;
};

describe("Update test", () => {
  before(() => {
    source = Util.read_from_json(source_full_name);
  });
  it("Update system only", () => {
    object_data.aml = {};
    const root = create_root();
    root._event_emitter.emit("aml");
    expect(root._system).to.equal(null);
    object_data.aml = { ID_system_0: {} };
    root._event_emitter.emit("aml");
    expect(root._system).to.not.equal(null);
  });
  it("Update system only and then update all full system", () => {
    const root = create_root();

    {
      object_data.aml = { ID_system_0: {} };
      root._event_emitter.emit("aml");
      const { _running_programs } = root._system;
      expect(root._system).to.not.equal(null);
      expect(Object.keys(_running_programs).length).to.equal(0);
    }

    {
      object_data.aml = {
        ID_system_1: { ID_program_1: { ID_module_1: { ID_script_1: {} } } }
      };
      root._event_emitter.emit("aml");

      const { _running_programs } = root._system;
      const { _running_modules } = _running_programs["Name_program"];
      const { _running_scripts } = _running_modules["Name_module"];

      expect(Object.keys(_running_programs).length).to.equal(1);
      expect(Object.keys(_running_programs)[0]).to.equal("Name_program");
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(Object.keys(_running_modules)[0]).to.equal("Name_module");
      expect(Object.keys(_running_scripts).length).to.equal(1);
      expect(Object.keys(_running_scripts)[0]).to.equal("Name_script");
    }
  });
  it("Update full system and then update all start from scripts", () => {
    const root = create_root();

    object_data.aml = {
      ID_system_1: { ID_program_1: { ID_module_1: { ID_script_1: {} } } }
    };
    root._event_emitter.emit("aml");

    const { _running_programs } = root._system;
    const { _running_modules } = _running_programs["Name_program"];
    const { _running_scripts } = _running_modules["Name_module"];

    object_data.aml = {
      ID_system_1: { ID_program_1: { ID_module_1: { ID_script_0: {} } } }
    };
    root._event_emitter.emit("aml");
    expect(Object.values(_running_scripts)[0].get_id()).to.equal("ID_script_0");
    object_data.aml = {
      ID_system_1: { ID_program_1: { ID_module_0: { ID_script_0: {} } } }
    };
    root._event_emitter.emit("aml");
    expect(Object.values(_running_modules)[0].get_id()).to.equal("ID_module_0");
    object_data.aml = {
      ID_system_1: { ID_program_0: { ID_module_0: { ID_script_0: {} } } }
    };
    root._event_emitter.emit("aml");
    expect(Object.values(_running_programs)[0].get_id()).to.equal(
      "ID_program_0"
    );
    object_data.aml = {
      ID_system_0: { ID_program_0: { ID_module_0: { ID_script_0: {} } } }
    };
    root._event_emitter.emit("aml");
    expect(root._system.get_id()).to.equal("ID_system_0");
  });
});
