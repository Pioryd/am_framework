const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Form = require("../../src/scripting_system/form");
const {
  RETURN_CODE
} = require("../../src/scripting_system/instruction/return_code");
const EventEmitter = require("events");

const forms_full_name = path.join(__dirname, "forms_test.json");

let root = {
  forms_source: {},
  rules_event_emitter: new EventEmitter(),
  signals_event_emitter: new EventEmitter(),
  events_event_emitter: new EventEmitter(),
  pop_return_values: () => {
    return [];
  }
};

describe("Forms test", () => {
  before(() => {
    const forms_source_array = Util.read_from_json(forms_full_name);
    for (const source of forms_source_array)
      root.forms_source[source.name] = source;
  });
  it("Parse", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

    expect(form.id).to.equal("Test_1_ID");
    expect(form._name).to.equal("Test_1");
    expect(form._rules.length).to.equal(3);
    expect(form._signals.length).to.equal(3);
    expect(form._events.length).to.equal(1);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
  });
  it("Process", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(0);
    form.process(root);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(1);
    form.process(root);
    expect(Object.keys(form._running_scripts).length).to.equal(0);
  });
  it("Rules", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

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
    const form = new Form(root, root.forms_source["Test_1"]);

    // energy
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.signals_event_emitter.emit("energy", 100);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.signals_event_emitter.emit("energy", 70);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Events", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

    // time
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.events_event_emitter.emit("time", 1680926960000);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.events_event_emitter.emit("time", 1580928360000);
    expect(Object.keys(form._running_scripts).length).to.equal(2);
  });
  it("Actions", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

    // script_terminate
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    root.signals_event_emitter.emit("stres", 85);
    expect(Object.keys(form._running_scripts).length).to.equal(0);

    // script_set_data
    root.signals_event_emitter.emit("choice", 10);
    expect(Object.keys(form._running_scripts).length).to.equal(1);
    expect(form._running_scripts["test_script_N2"].data.val).to.equal(10);
  });
});
