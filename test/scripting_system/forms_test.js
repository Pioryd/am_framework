const { expect, config } = require("chai");
const path = require("path");
const fs = require("fs");
const { Util } = require("../../src/util");
const Root = require("../../src/aml/root");
const Form = require("../../src/aml/form");
const Script = require("../../src/aml/script");

const forms_full_name = path.join(__dirname, "forms_test.json");
const scripts_path_full_name = path.join(__dirname, "forms_scripts");

const root = new Root();

describe("Forms test", () => {
  before(() => {
    const forms_test_json = Util.read_from_json(forms_full_name);
    root.source.forms = forms_test_json.forms;

    for (const form_source of Object.values(root.source.forms)) {
      for (const scripts_id of form_source.scripts) {
        root.source.scripts[scripts_id] = Script.parse(
          scripts_id,
          fs.readFileSync(
            path.join(scripts_path_full_name, scripts_id + ".aml"),
            "utf8",
            (err) => {
              if (err) throw new Error(err);
            }
          )
        );
      }
    }
  });
  it("Parse", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    expect(form.get_id()).to.equal("Test_1");
    expect(form._source.rules.length).to.equal(7);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
  });
  it("Process", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(0);
    form.process(root);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(1);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(0);
  });
  it("Rules", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    // form_init
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    form.process(root);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(0);

    // script_run
    form._run_script("test_script_N1");
    expect(Object.keys(form._running_scripts).length).to.equal(2);

    form.process(root);
    form.process(root);

    // script_processed
    expect(Object.keys(form._running_scripts).length).to.equal(0);
    form._run_script("test_script_N3");
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(Object.keys(form._running_scripts)[0]).to.equal("test_script_N2");
  });
  it("Signals", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    // energy
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.event_emitter.emit("energy", 100);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.event_emitter.emit("energy", 70);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Events", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    // time
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.event_emitter.emit("time", 1680926960000);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.event_emitter.emit("time", 1580928360000);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Actions", () => {
    const form = new Form(root, root.source.forms["Test_1"]);

    // script_terminate
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.event_emitter.emit("stres", 85);
    expect(Object.keys(form._running_scripts).length).to.equal(0);

    // script_set_data
    root.event_emitter.emit("choice", 10);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(10);
  });
});
