const { expect, config } = require("chai");
const { Util } = require("../../src/util");
const { Stopper } = require("../../src/stopper");
const { Stopwatch } = require("../../src/stopwatch");
const Helper = require("./api_helper");
const { RETURN_CODE } = require("../../src/aml/script/instruction/return_code");

const helper = new Helper();

describe("Test instruction - Api", () => {
  before(() => {
    helper.initialize();
  });
  describe("Return_value", () => {
    it("01 - Not received", () => {
      const script = helper.get_script({
        id: "ID_Test_api",
        manual_poll: true
      });

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
      const script = helper.get_script({
        id: "ID_Test_api",
        manual_poll: false
      });

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
        const script = helper.get_script({
          id: "ID_Test_api",
          manual_poll: true
        });

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
      const script = helper.get_script({
        id: "ID_Test_api",
        manual_poll: true
      });

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
      const script = helper.get_script({
        id: "ID_Test_api",
        manual_poll: true
      });

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
