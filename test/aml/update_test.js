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
  root.install_source_getter(({ type, name }) => {
    const data = {
      system: { Name_system: source.system[aml_data_index] },
      program: { Name_program: source.program[aml_data_index] },
      form: { Name_form: source.form[aml_data_index] },
      script: { Name_script: source.script[aml_data_index] }
    };
    return data[type][name];
  });
  return root;
};

describe("System test", () => {
  before(() => {
    source = Util.read_from_json(source_full_name);
  });
  it("Update system only", () => {
    const root = create_root();

    expect(root._system).to.equal(null);
    aml_data_index = 0;
    root.update({ type: "system", name: "Name_system" });
    expect(root._system).to.not.equal(null);
  });
  it("Update system only and then update all full system", () => {
    const root = create_root();

    {
      aml_data_index = 0;
      root.update({ type: "system", name: "Name_system" });

      const { _running_programs } = root._system;

      expect(root._system).to.not.equal(null);
      expect(Object.keys(_running_programs).length).to.equal(0);
    }

    {
      aml_data_index = 1;
      root.update({ type: "system", name: "Name_system" });

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
    root.update({ type: "system", name: "Name_system" });

    const { _running_programs } = root._system;
    const { _running_forms } = _running_programs["Name_program"];
    const { _running_scripts } = _running_forms["Name_form"];

    aml_data_index = 0;
    root.update({ type: "script", name: "Name_script" });
    expect(Object.values(_running_scripts)[0].get_id()).to.equal("ID_script_0");
    root.update({ type: "form", name: "Name_form" });
    expect(Object.values(_running_forms)[0].get_id()).to.equal("ID_form_0");
    root.update({ type: "program", name: "Name_program" });
    expect(Object.values(_running_programs)[0].get_id()).to.equal(
      "ID_program_0"
    );
    root.update({ type: "system", name: "Name_system" });
    expect(root._system.get_id()).to.equal("ID_system_0");
  });
});
