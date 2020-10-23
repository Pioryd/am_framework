const { expect } = require("chai");
const path = require("path");
const Helper = require("../helper");

const AML = {
  program: "ID_Program_1",
  modules: { Name_Module_1: "ID_Module_1" },
  scripts: {
    Name_Script_1: "ID_Script_1",
    Name_Script_2: "ID_Script_2",
    Name_Script_3: "ID_Script_3"
  }
};

const helper = new Helper({
  json_full_name: path.join(__dirname, "test.json"),
  aml_full_path: __dirname
});

describe("Module", () => {
  before(() => {
    helper.load_source();
  });
  it("Parse", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });

    const module = root._program._running_modules["Name_Module_1"];

    expect(module.get_id()).to.equal("ID_Module_1");
    expect(module._source.rules.length).to.equal(5);
    expect(Object.keys(module._running_scripts).length).to.equal(1);
  });
  it("Process (to script processed)", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });

    const module = root._program._running_modules["Name_Module_1"];

    expect(Object.keys(module._running_scripts).length).to.equal(1);
    expect(module._running_scripts["Name_Script_2"].data.val).to.equal(0);
    root.process(root);
    expect(module._running_scripts["Name_Script_2"].data.val).to.equal(1);
    root.process(root);
    expect(Object.keys(module._running_scripts).length).to.equal(0);
  });
  it("Update mirror", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });

    const module = root._program._running_modules["Name_Module_1"];

    expect(Object.keys(module._running_scripts).length).to.equal(1);
    root.process(root);
    root.process(root);
    expect(Object.keys(module._running_scripts).length).to.equal(0);

    // script_initialize
    root.update_mirror({ aml: AML, trigger_01: true });
    expect(Object.keys(module._running_scripts).length).to.equal(2);

    root.process(root);
    root.process(root);

    // script_processed
    expect(Object.keys(module._running_scripts).length).to.equal(0);
    root.update_mirror({ aml: AML, trigger_02: true });
    expect(Object.keys(module._running_scripts).length).to.equal(1);
    root.process(root);
    expect(Object.keys(module._running_scripts).length).to.equal(1);
    expect(Object.keys(module._running_scripts)[0]).to.equal("Name_Script_2");
  });
});
