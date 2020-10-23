const { expect } = require("chai");
const path = require("path");
const Helper = require("./helper");

const AML = {
  program: "ID_Program_1",
  modules: { Name_Module_1: "ID_Module_1", Name_Module_2: "ID_Module_2" }
};

const helper = new Helper({
  json_full_name: path.join(__dirname, "program_test.json")
});

describe("Program", () => {
  before(() => {
    helper.load_source();
  });
  it("Parse", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });
    expect(root._program.get_id()).to.equal("ID_Program_1");
    expect(root._program._source.rules.length).to.equal(5);
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
  });

  it("Update mirror", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // action - module_initialize
    root.update_mirror({ aml: AML, trigger_01: 5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);

    // action - module_terminate
    root.update_mirror({ aml: AML, trigger_01: 20 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // ignore if module to initialize/terminate not exist
    root.update_mirror({ aml: AML, trigger_01: 20, trigger_02: 0 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
    root.update_mirror({ aml: AML, trigger_01: 20, trigger_02: 100 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // Also check:
    //  - ignore additional not existed modules - "Name_Module_3"
  });
});
