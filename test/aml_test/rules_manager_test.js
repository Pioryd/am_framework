const { expect } = require("chai");
const path = require("path");
const Helper = require("./helper");

const AML = {
  program: "ID_Program_1",
  modules: { Name_Module_1: "ID_Module_1", Name_Module_2: "ID_Module_2" }
};

const helper = new Helper({
  json_full_name: path.join(__dirname, "rules_manager_test.json")
});

describe("Rules manager", () => {
  before(() => {
    helper.load_source();
  });
  it("Triggers - event", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
  });
  it("Triggers - min/max", () => {
    const root = helper.create_root();

    // Out of range
    root.update_mirror({ aml: AML, trigger_01: -1 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
    root.update_mirror({ aml: AML, trigger_01: 101 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // In range
    root.update_mirror({ aml: AML, trigger_01: 5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_01: 20 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // Add one to check if Non-number won't work
    root.update_mirror({ aml: AML, trigger_01: 5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);

    // Non-number
    root.update_mirror({ aml: AML, trigger_01: true });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_01: false });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);

    // Non-number
    root.update_mirror({ aml: AML, trigger_01: "5" });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_01: "20" });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
  });
  it("Triggers - value", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_02: 3 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_02: 5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_02: 4.5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_02: 6.5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_02: -7 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_02: 0 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_02: "init" });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_02: "term" });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_02: true });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_02: false });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
  });
  it("Triggers - any", () => {
    const root = helper.create_root();

    root.update_mirror({ aml: AML });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: "any_value" });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: "any_value" });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: 1 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: 1 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: 1.5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: 1.5 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: -3 });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: -3 });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: false });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: false });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: {} });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: {} });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    root.update_mirror({ aml: AML, trigger_03: [] });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: [] });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);

    // null is not allowed, but doesn't matter here.
    root.update_mirror({ aml: AML, trigger_03: null });
    expect(Object.keys(root._program._running_modules).length).to.equal(2);
    root.update_mirror({ aml: AML, trigger_04: null });
    expect(Object.keys(root._program._running_modules).length).to.equal(1);
  });
});
