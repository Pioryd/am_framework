const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/am/root");
const Program = require("../../src/am/program");

const programs_full_name = path.join(__dirname, "program_test.json");

const root = new Root();

describe("Program test", () => {
  before(() => {
    const program_test_json = Util.read_from_json(programs_full_name);
    root.source.forms = program_test_json.forms;
    root.source.programs = program_test_json.programs;
  });
  it("Parse", () => {
    const program = new Program(root, root.source.programs["Test_1"]);

    expect(program.get_id()).to.equal("Test_1");
    expect(program._source.rules.length).to.equal(4);
    expect(program._source.forms.length).to.equal(2);
  });
});
