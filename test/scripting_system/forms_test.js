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
  events_event_emitter: new EventEmitter()
};

describe("Forms test", () => {
  before(() => {
    const forms_source_array = Util.read_from_json(forms_full_name);
    for (const source of forms_source_array)
      root.forms_source[source.name] = source;
    console.log({ forms_source_array, forms_source: root.forms_source });
  });
  it("Parse form", () => {
    const form = new Form(root, root.forms_source["Test_1"]);

    expect(form.id).to.equal("Test_1_ID");
    expect(form._name).to.equal("Test_1");
    expect(form._rules.length).to.equal(1);
    expect(form._signals.length).to.equal(1);
    expect(form._events.length).to.equal(1);
    expect(Object.keys(form._running_scripts).length).to.equal(0);
  });

  it("Process form", () => {
    const form = new Form(root, root.forms_source["Test_1"]);
    form.process(root);
  });
});
