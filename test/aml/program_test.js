const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");
const Program = require("../../src/aml/program");

const programs_full_name = path.join(__dirname, "program_test.json");

let source = {};
const root = new Root();
root.get_source_async = ({ type, name }, callback) => {
  if (type === "form") callback(source.forms[name]);
  else if (type === "program") callback(source.programs[name]);
};

describe("Program test", () => {
  before(() => {
    const program_test_json = Util.read_from_json(programs_full_name);
    source.forms = program_test_json.forms;
    source.programs = program_test_json.programs;
  });
  it("Parse", () => {
    const program = new Program(root, source.programs["ID_Test_1"]);

    expect(program.get_id()).to.equal("ID_Test_1");
    expect(program._source.rules.length).to.equal(4);
  });
});
