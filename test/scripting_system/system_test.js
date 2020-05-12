const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/am/root");
const System = require("../../src/am/system");

const system_full_name = path.join(__dirname, "system_test.json");

const root = new Root();
let system_test_json = {};

describe("System test", () => {
  before(() => {
    system_test_json = Util.read_from_json(system_full_name);
    root.source.systems = system_test_json.systems;
    root.source.programs = system_test_json.programs;
  });
  it("Parse", () => {
    const system = new System(root, root.source.systems["Test_system"]);

    expect(system.get_id()).to.equal("Test_system");
    expect(system._programs_list.length).to.equal(1);
  });
});
