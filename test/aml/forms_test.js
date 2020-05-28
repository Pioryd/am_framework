const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");
const Form = require("../../src/aml/form");
const Script = require("../../src/aml/script");
const to_json = require("../../src/aml/script/to_json");
const forms_full_name = path.join(__dirname, "forms_test.json");
const scripts_path_full_name = path.join(__dirname, "forms_test");

let form_source = {};
let scripts = {};

const root = new Root();
root.get_source_async = ({ type, name }, callback) => {
  callback(scripts[name]);
};

describe("Forms test", () => {
  before(() => {
    form_source = Util.read_from_json(forms_full_name)["ID_Test_1"];

    for (const scripts_name of [
      "Name_test_script_N1",
      "Name_test_script_N2",
      "Name_test_script_N3"
    ]) {
      scripts[scripts_name] = to_json(
        `ID_${scripts_name}`,
        fs.readFileSync(
          path.join(scripts_path_full_name, scripts_name + ".aml"),
          "utf8",
          (err) => {
            if (err) throw new Error(err);
          }
        )
      );
    }
  });
  it("Parse", () => {
    const form = new Form(root, form_source);

    expect(form.get_id()).to.equal("ID_Test_1");
    expect(form._source.rules.length).to.equal(6);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
  });
  it("Process", () => {
    const form = new Form(root, form_source);

    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(form._running_scripts["Name_test_script_N2"].data.val).to.equal(0);
    form.process(root);
    expect(form._running_scripts["Name_test_script_N2"].data.val).to.equal(1);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(0);
  });
  it("Rules", () => {
    const form = new Form(root, form_source);

    // form_init
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    form.process(root);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(0);

    // script_run
    form._run_script("Name_test_script_N1");
    expect(Object.keys(form._running_scripts).length).to.equal(2);

    form.process(root);
    form.process(root);

    // script_processed
    expect(Object.keys(form._running_scripts).length).to.equal(0);
    form._run_script("Name_test_script_N3");
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(Object.keys(form._running_scripts)[0]).to.equal(
      "Name_test_script_N2"
    );
  });
  it("Signals", () => {
    const form = new Form(root, form_source);

    // energy
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.emit("energy", 100);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.emit("energy", 70);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Events", () => {
    const form = new Form(root, form_source);

    // time
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.emit("time", 1680926960000);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.emit("time", 1580928360000);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Actions", () => {
    const form = new Form(root, form_source);

    // script_terminate
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.emit("stres", 85);
    expect(Object.keys(form._running_scripts).length).to.equal(0);
  });
});
