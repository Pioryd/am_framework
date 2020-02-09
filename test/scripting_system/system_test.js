const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/scripting_system/root");
const System = require("../../src/scripting_system/system");

const system_full_name = path.join(__dirname, "system_test.json");

const root = new Root();
let system_source = {};

describe("System test", () => {
  before(() => {
    system_source = Util.read_from_json(system_full_name);
  });
  it("Parse", () => {
    const system = new System(root, system_source);

    expect(system._id).to.equal("Test_system_ID");
    expect(system._name).to.equal("Test_system");
    expect(system._programs.length).to.equal(1);
    expect(system._programs_list.length).to.equal(1);
  });
});
