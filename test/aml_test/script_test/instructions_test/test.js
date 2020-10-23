const { expect } = require("chai");
const path = require("path");
const Helper = require("../../helper");
const { Stopper } = require("../../../../src/stopper");
const {
  RETURN_CODE
} = require("../../../../src/aml/script/instruction/return_code");

const helper = new Helper({
  json_full_name: path.join(__dirname, "test.json"),
  aml_full_path: __dirname
});

describe("Scripting system test", () => {
  before(() => {
    helper.load_source();
  });
  it("Test instruction - JS", () => {
    const root = helper.create_root();
    root.update_mirror({
      aml: {
        program: "ID_Program",
        modules: { Name_Module: "ID_Module" },
        scripts: { Name_Script: "ID_js" }
      }
    });
    const { _running_scripts } = root._program._running_modules["Name_Module"];
    const script = _running_scripts["Name_Script"];

    expect(script.data.val).to.equal(0);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.equal(1);
  });
  it("Test instruction - Scope", () => {
    const root = helper.create_root();
    root.update_mirror({
      aml: {
        program: "ID_Program",
        modules: { Name_Module: "ID_Module" },
        scripts: { Name_Script: "ID_scope" }
      }
    });
    const { _running_scripts } = root._program._running_modules["Name_Module"];
    const script = _running_scripts["Name_Script"];

    expect(script.data.val).to.equal(0);
    expect(script._root_scope._current_child_index).to.equal(0);
    for (let i = 0; i < 2; i++) {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING, `Index [${i}]`);
    }

    expect(script._root_scope._current_child_index).to.equal(2);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script._root_scope._current_child_index).to.equal(0);
    expect(script.data.val).to.equal(3);
  });
  describe("Test instruction - Scope_IF", () => {
    it("First condition", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_scope_if" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      for (let i = 0; i < 2; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `Index [${i}]`
        );
      }
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(3);
    });
    it("Second condition", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_scope_if" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      script.data.val = 1;
      for (let i = 0; i < 2; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `Index [${i}]`
        );
      }
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(5);
    });
    it("Third condition", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_scope_if" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      script.data.val = 10;
      for (let i = 0; i < 2; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `Index [${i}]`
        );
      }
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(15);
    });
  });
  it("Test instruction - Scope_WHILE", () => {
    const root = helper.create_root();
    root.update_mirror({
      aml: {
        program: "ID_Program",
        modules: { Name_Module: "ID_Module" },
        scripts: { Name_Script: "ID_scope_while" }
      }
    });
    const { _running_scripts } = root._program._running_modules["Name_Module"];
    const script = _running_scripts["Name_Script"];

    for (let i = 0; i < 6; i++) {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING, `Index [${i}]`);
    }
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.deep.equal(4);
  });

  it("Test instruction - Scope_FOR", () => {
    const root = helper.create_root();
    root.update_mirror({
      aml: {
        program: "ID_Program",
        modules: { Name_Module: "ID_Module" },
        scripts: { Name_Script: "ID_scope_for" }
      }
    });
    const { _running_scripts } = root._program._running_modules["Name_Module"];
    const script = _running_scripts["Name_Script"];

    for (let i = 0; i < 5; i++) {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING, `Index [${i}]`);
    }

    expect(script.data.i).to.deep.equal(1);
    for (let i = 0; i < 4; i++) {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING, `Index [${i}]`);
    }
    expect(script.data.i).to.deep.equal(2);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.deep.equal(4);
  });
  describe("Test instruction - Internal", () => {
    it("break", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_internal_break" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      // For
      for (let i = 0; i < 6; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.i).to.deep.equal(0);
      // While
      for (let i = 0; i < 6; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      expect(script.data.val).to.deep.equal(4);
      expect(script.data.val_2).to.deep.equal(1);
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(4);
      expect(script.data.val_2).to.deep.equal(1);
    });
    it("continue", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_internal_continue" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      // Scope for
      for (let i = 0; i < 13; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      expect(script.data.i).to.deep.equal(2);
      expect(script.data.val).to.deep.equal(0);
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      expect(script.data.i).to.deep.equal(2);
      expect(script.data.val).to.deep.equal(0);
      // Scope while
      for (let i = 0; i < 6; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.val_2).to.deep.equal(0);
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.val_2).to.deep.equal(0);
    });
    it("sleep 50", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_internal_sleep" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      const stopper = new Stopper();
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
      }
      let while_return_code = RETURN_CODE.PROCESSING;
      stopper.start();
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      stopper.stop();
      expect(stopper.get_elapsed_milliseconds()).to.be.at.least(50);
      expect(script.data.val).to.deep.equal(2);
    });
    it("label and goto", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_label_and_goto" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      /**
       *   TODO
       *   label/goto have so many cases.
       *   Currently don't have time to make tests for all cases.
       */
      // Forward
      for (let i = 0; i < 7; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `For_Index[${i}]`
        );
      }
      expect(script.data.val).to.deep.equal(0);
      expect(script.data.val_2).to.deep.equal(0);
      // Backward
      for (let i = 0; i < 3; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `For_Index[${i}]`
        );
      }
      expect(script.data.val).to.deep.equal(0);
      expect(script.data.val_2).to.deep.equal(1);
      // Forward;
      for (let i = 0; i < 2; i++) {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(
          RETURN_CODE.PROCESSING,
          `For_Index[${i}]`
        );
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.val_2).to.deep.equal(1);
      {
        const { return_code } = script.process(null, root);
        expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
      }
      expect(script.data.val).to.deep.equal(2);
      expect(script.data.val_2).to.deep.equal(1);
    });
    it("unhandled_internal", () => {
      const root = helper.create_root();
      root.update_mirror({
        aml: {
          program: "ID_Program",
          modules: { Name_Module: "ID_Module" },
          scripts: { Name_Script: "ID_unhandled_internal" }
        }
      });
      const { _running_scripts } = root._program._running_modules[
        "Name_Module"
      ];
      const script = _running_scripts["Name_Script"];

      script.data.val = 0;
      script.process(null, root);
      expect(() => {
        script.process(null, root);
      }).to.throw();

      script.data.val = 1;
      script.process(null, root);
      expect(() => {
        script.process(null, root);
      }).to.throw();

      script.data.val = 2;
      script.process(null, root);
      script.process(null, root);
      expect(() => {
        script.process(null, root);
      }).to.throw();
    });
  });
});
