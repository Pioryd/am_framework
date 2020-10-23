const { expect } = require("chai");
const path = require("path");
const Helper = require("../../helper");
const { Stopwatch } = require("../../../../src/stopwatch");
const {
  RETURN_CODE
} = require("../../../../src/aml/script/instruction/return_code");

const AML = {
  program: "ID_Program",
  modules: { Name_Module: "ID_Module" },
  scripts: { Name_Script: "ID_Script" }
};

const helper = new Helper({
  json_full_name: path.join(__dirname, "test.json"),
  aml_full_path: __dirname
});

describe("Test instruction - Api", () => {
  before(() => {
    helper.load_source();
  });
  describe("Return_value", () => {
    it("01 - Not received", () => {
      const root = helper.create_root();
      root.update_mirror({ aml: AML });
      helper.simulation.root = root;
      helper.simulation.manual_poll = true;
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      let while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, helper.root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.add_min_max).to.deep.equal(undefined);
      helper.manual_poll();
    });
    it("02 - Received immediately.", () => {
      const root = helper.create_root();
      root.update_mirror({ aml: AML });
      helper.simulation.root = root;
      helper.simulation.manual_poll = false;
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      let while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, helper.root);
        while_return_code = return_code;
      }

      expect(script.data.val).to.deep.equal(2);
      expect(script.data.add_min_max).to.deep.equal(6);
    });
    it(
      "03 - Received after script is processed first time and" +
        " before second time.",
      () => {
        const root = helper.create_root();
        root.update_mirror({ aml: AML });
        helper.simulation.root = root;
        helper.simulation.manual_poll = true;
        const { _running_scripts } = root._program._running_modules[
          "Name_Module"
        ];
        const script = _running_scripts["Name_Script"];

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, helper.root);
          while_return_code = return_code;
        }
        expect(script.data.val).to.deep.equal(2);
        expect(script.data.add_min_max).to.deep.equal(undefined);
        helper.manual_poll();
        {
          const { return_code } = script.process(null, helper.root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        expect(script.data.add_min_max).to.deep.equal(undefined);
      }
    );
    it("04 - Received before timeout and before script is processed.", () => {
      const root = helper.create_root();
      root.update_mirror({ aml: AML });
      helper.simulation.root = root;
      helper.simulation.manual_poll = true;
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      const stopwatch = new Stopwatch(15);
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      while (!stopwatch.is_elapsed()) {}
      helper.manual_poll();

      let while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, helper.root);
        while_return_code = return_code;
      }
      expect(script.data.add_min_max).to.deep.equal(6);
    });
    it("05 - Received after timeout and before script is processed.", () => {
      const root = helper.create_root();
      root.update_mirror({ aml: AML });
      helper.simulation.root = root;
      helper.simulation.manual_poll = true;
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      const stopwatch = new Stopwatch(25);
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      {
        const { return_code } = script.process(null, helper.root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      while (!stopwatch.is_elapsed()) {}
      helper.manual_poll();

      let while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, helper.root);
        while_return_code = return_code;
      }
      expect(script.data.add_min_max).to.deep.equal(undefined);
    });
  });
});
