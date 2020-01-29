const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const { Stopper } = require("../../src/stopper");
const parse = require("../../src/scripting_system/instruction/parse");
const {
  RETURN_CODE
} = require("../../src/scripting_system/instruction/return_code");

const script_full_name = path.join(__dirname, "script.json");
const root = { scripts: {} };

describe("Scripting system test", () => {
  before(() => {
    root.scripts = Util.read_from_json(script_full_name);
  });
  it("Test instruction - JS", () => {
    const script = parse(root, root.scripts["Test_js"]);
    expect(script.data.val).to.equal(0);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.equal(1);
  });
  it("Test instruction - Scope", () => {
    const script = parse(root, root.scripts["Test_scope"]);

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
      const script = parse(root, root.scripts["Test_scope_if"]);

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
      const script = parse(root, root.scripts["Test_scope_if"]);

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
      const script = parse(root, root.scripts["Test_scope_if"]);

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
    const script = parse(root, root.scripts["Test_scope_while"]);

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
    const script = parse(root, root.scripts["Test_scope_for"]);

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
      const script = parse(root, root.scripts["Test_internal_break"]);

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
      const script = parse(root, root.scripts["Test_internal_continue"]);

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
      const script = parse(root, root.scripts["Test_internal_sleep"]);

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
      const script = parse(root, root.scripts["Test_label_and_goto"]);

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
  });
  it("unhandled_internal", () => {
    const script = parse(root, root.scripts["Test_unhandled_internal"]);

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

  it("inside script", () => {
    const script = parse(root, root.scripts["Test_inside_script"]);
    script._debug_enabled = true;

    // No timeout - Test_scope
    for (let i = 0; i < 4; i++) {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(
        RETURN_CODE.PROCESSING,
        `For_Index[${i}]`
      );
    }
    expect(script.data.val).to.deep.equal(4);

    //   // Timeout 20 - Test_internal_sleep
    //   let while_return_code = RETURN_CODE.PROCESSING;
    //   while (while_return_code === RETURN_CODE.PROCESSING) {
    //     const { return_code } = script.process(null, root);
    //     while_return_code = return_code;
    //   }
    //   expect(script.data.val).to.deep.equal(6);
  });
});