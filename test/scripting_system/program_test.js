const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/scripting_system/root");
const Program = require("../../src/scripting_system/program");

const programs_full_name = path.join(__dirname, "program_test.json");

const root = new Root();

describe("Program test", () => {
  before(() => {
    const programs_source = Util.read_from_json(programs_full_name);
    root.forms = programs_source.forms;
    root.programs = programs_source.programs;
  });
  it("Parse", () => {
    const program = new Program(root, root.programs["Test_1"]);

    expect(program._id).to.equal("Test_1_ID");
    expect(program._name).to.equal("Test_1");
    expect(program._rules.length).to.equal(1);
    expect(program._signals.length).to.equal(2);
    expect(program._events.length).to.equal(1);
    expect(program._forms.length).to.equal(2);
    expect(program._current_form._name).equal("Test_form_1");
  });
});
