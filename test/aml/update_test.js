const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");

const DEBUG_ENABLED = false;
const source_full_name = path.join(__dirname, "update_test.json");

let source = {};
let aml_data_index = 1;

const create_root = () => {
  const root = new Root();
  root.options.debug_enabled = DEBUG_ENABLED;
  root.install_source_getter_async(({ type, id }, callback) => {
    callback(source[type][id]);
  });
  return root;
};

describe("Update test", () => {
  before(() => {
    source = Util.read_from_json(source_full_name);
  });
  it("Update system only", () => {
    const root = create_root();

    expect(root._system).to.equal(null);
    aml_data_index = 0;
    root.source_ids = {
      system: { Name_system: "ID_system_0" },
      program: { Name_program: "ID_program_0" },
      form: { Name_form: "ID_form_0" },
      script: { Name_script: "ID_script_0" }
    };
    root.update("system", source.system["ID_system_0"]);
    expect(root._system).to.not.equal(null);
  });
  it("Update system only and then update all full system", () => {
    const root = create_root();

    {
      aml_data_index = 0;
      root.source_ids = {
        system: { Name_system: "ID_system_0" },
        program: { Name_program: "ID_program_0" },
        form: { Name_form: "ID_form_0" },
        script: { Name_script: "ID_script_0" }
      };
      root.update("system", source.system["ID_system_0"]);

      const { _running_programs } = root._system;

      expect(root._system).to.not.equal(null);
      expect(Object.keys(_running_programs).length).to.equal(0);
    }

    {
      aml_data_index = 1;
      root.source_ids = {
        system: { Name_system: "ID_system_1" },
        program: { Name_program: "ID_program_1" },
        form: { Name_form: "ID_form_1" },
        script: { Name_script: "ID_script_1" }
      };
      root.update("system", source.system["ID_system_1"]);

      const { _running_programs } = root._system;
      const { _running_forms } = _running_programs["Name_program"];
      const { _running_scripts } = _running_forms["Name_form"];

      expect(Object.keys(_running_programs).length).to.equal(1);
      expect(Object.keys(_running_programs)[0]).to.equal("Name_program");
      expect(Object.keys(_running_forms).length).to.equal(1);
      expect(Object.keys(_running_forms)[0]).to.equal("Name_form");
      expect(Object.keys(_running_scripts).length).to.equal(1);
      expect(Object.keys(_running_scripts)[0]).to.equal("Name_script");
    }
  });
  it("Update full system and then update all start from scripts", () => {
    const root = create_root();

    aml_data_index = 1;
    root.source_ids = {
      system: { Name_system: "ID_system_1" },
      program: { Name_program: "ID_program_1" },
      form: { Name_form: "ID_form_1" },
      script: { Name_script: "ID_script_1" }
    };
    root.update("system", source.system["ID_system_1"]);

    const { _running_programs } = root._system;
    const { _running_forms } = _running_programs["Name_program"];
    const { _running_scripts } = _running_forms["Name_form"];

    aml_data_index = 0;
    root.source_ids = {
      system: { Name_system: "ID_system_0" },
      program: { Name_program: "ID_program_0" },
      form: { Name_form: "ID_form_0" },
      script: { Name_script: "ID_script_0" }
    };

    root.update("script", source.script["ID_script_0"]);
    expect(Object.values(_running_scripts)[0].get_id()).to.equal("ID_script_0");
    root.update("form", source.form["ID_form_0"]);
    expect(Object.values(_running_forms)[0].get_id()).to.equal("ID_form_0");
    root.update("program", source.program["ID_program_0"]);
    expect(Object.values(_running_programs)[0].get_id()).to.equal(
      "ID_program_0"
    );
    root.update("system", source.system["ID_system_0"]);
    expect(root._system.get_id()).to.equal("ID_system_0");
  });
});
