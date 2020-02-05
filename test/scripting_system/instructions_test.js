const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const { Stopper } = require("../../src/stopper");
const { Stopwatch } = require("../../src/stopwatch");
const parse = require("../../src/scripting_system/instruction/parse");
const {
  RETURN_CODE
} = require("../../src/scripting_system/instruction/return_code");

const scripts_full_name = path.join(__dirname, "instructions_test.json");

let root = {
  form: { _source: { scripts: [] } },
  api: { std: {} },
  return_values_setters_queues: {},
  generate_id: () => {
    return "1";
  }
};

function get_script_by_name(name) {
  for (const script of root.form._source.scripts)
    if (script.name === name) return script;
}

describe("Scripting system test", () => {
  before(() => {
    const scripts_source = Util.read_from_json(scripts_full_name);

    for (const script of Object.values(scripts_source)) {
      root.form._source.scripts.push(script);
      root.return_values_setters_queues[script.id] = [];
    }

    root.pop_return_values = function(script_id) {
      if (!(script_id in this.return_values_setters_queues))
        throw "Not found script id:" + script_id;

      const current_length = this.return_values_setters_queues[script_id]
        .length;
      const new_array = [];
      for (let i = 0; i < current_length; i++)
        new_array.push(this.return_values_setters_queues[script_id].shift());

      return new_array;
    };
  });
  it("Test instruction - JS", () => {
    const script = parse(root.form, get_script_by_name("Test_js"));
    expect(script.data.val).to.equal(0);
    {
      const { return_code } = script.process(null, root);
      expect(return_code).to.deep.equal(RETURN_CODE.PROCESSED);
    }
    expect(script.data.val).to.equal(1);
  });
  it("Test instruction - Scope", () => {
    const script = parse(root.form, get_script_by_name("Test_scope"));

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
      const script = parse(root.form, get_script_by_name("Test_scope_if"));

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
      const script = parse(root.form, get_script_by_name("Test_scope_if"));

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
      const script = parse(root.form, get_script_by_name("Test_scope_if"));

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
    const script = parse(root.form, get_script_by_name("Test_scope_while"));

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
    const script = parse(root.form, get_script_by_name("Test_scope_for"));

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
      const script = parse(
        root.form,
        get_script_by_name("Test_internal_break")
      );

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
      const script = parse(
        root.form,
        get_script_by_name("Test_internal_continue")
      );

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
      const script = parse(
        root.form,
        get_script_by_name("Test_internal_sleep")
      );

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
      const script = parse(
        root.form,
        get_script_by_name("Test_label_and_goto")
      );

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
      const script = parse(
        root.form,
        get_script_by_name("Test_unhandled_internal")
      );

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
  it("Test instruction - Api", () => {
    for (let i = 0; i < 5; i++) {
      const script = parse(root.form, get_script_by_name("Test_api"));
      const Test_api = {
        return_value_string: "",
        returned_value: {},
        send: function(script_id, query_id, timeout, return_value, args) {
          this.return_value_string = return_value;
          this.returned_value = Number(args.min) + Number(args.max);
        },
        receive: function(script_id, query_id) {
          root.return_values_setters_queues[script_id].push({
            query_id,
            set: Util.string_to_function(
              `(script, root){${this.return_value_string} = ${JSON.stringify(
                this.returned_value
              )};}`
            )
          });
        },
        stop: function() {
          this.send_status = "none";
        }
      };

      // Query is not received
      if (i === 0) {
        root.api.std.add_min_max = (...args) => {
          Test_api.send(...args);
          Test_api.stop();
        };

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, root);
          while_return_code = return_code;
        }
        expect(script.data.val).to.deep.equal(2);
        expect(script.data.added_min_max).to.deep.equal(undefined);
      }

      // Query is received before script begin processed.
      if (i === 1) {
        root.api.std.add_min_max = (...args) => {
          const script_id = args[0];
          const query_id = args[1];
          Test_api.send(...args);
          Test_api.receive(script_id, query_id);
        };

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, root);
          while_return_code = return_code;
        }
        expect(script.data.val).to.deep.equal(2);
        expect(script.data.added_min_max).to.deep.equal(6);
      }

      // Query is received after script begin processed.
      if (i === 2) {
        root.api.std.add_min_max = (...args) => {
          Test_api.send(...args);
        };

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, root);
          while_return_code = return_code;
        }
        expect(script.data.val).to.deep.equal(2);
        expect(script.data.added_min_max).to.deep.equal(undefined);
        Test_api.receive(script.id, "1");
        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        expect(script.data.added_min_max).to.deep.equal(undefined);
      }

      // Query is received after timeout and before script begin processed.
      if (i === 3) {
        root.api.std.add_min_max = (...args) => {
          Test_api.send(...args);
        };
        const stopwatch = new Stopwatch(15);

        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        while (!stopwatch.is_elapsed()) {}
        Test_api.receive(script.id, "1");

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, root);
          while_return_code = return_code;
        }
        expect(script.data.added_min_max).to.deep.equal(6);
      }

      // Query is received after timeout and before script begin processed.
      if (i === 4) {
        root.api.std.add_min_max = (...args) => {
          Test_api.send(...args);
        };
        const stopwatch = new Stopwatch(25);

        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        {
          const { return_code } = script.process(null, root);
          expect(return_code).to.deep.equal(RETURN_CODE.PROCESSING);
        }
        while (!stopwatch.is_elapsed()) {}
        Test_api.receive(script.id, "1");

        let while_return_code = RETURN_CODE.PROCESSING;
        while (while_return_code === RETURN_CODE.PROCESSING) {
          const { return_code } = script.process(null, root);
          while_return_code = return_code;
        }
        expect(script.data.added_min_max).to.deep.equal(undefined);
      }
    }
  });

  describe("Timeout", () => {
    it("timeout - Scope", () => {
      const script = parse(root.form, get_script_by_name("Test_timeout_scope"));

      // Scope
      let while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(3);
    });

    it("timeout - If", () => {
      const script = parse(root.form, get_script_by_name("Test_timeout_if"));

      // If
      while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(3);
    });

    it("timeout - While", () => {
      const script = parse(root.form, get_script_by_name("Test_timeout_while"));

      // If
      while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(3);
    });

    it("timeout - For", () => {
      const script = parse(root.form, get_script_by_name("Test_timeout_for"));

      // If
      while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(3);
    });
    it("timeout - Script", () => {
      const script = parse(
        root.form,
        get_script_by_name("Test_timeout_script")
      );

      // Script inside script inside script
      while_return_code = RETURN_CODE.PROCESSING;
      while (while_return_code === RETURN_CODE.PROCESSING) {
        const { return_code } = script.process(null, root);
        while_return_code = return_code;
      }
      expect(script.data.val).to.deep.equal(4);
    });
  });
});
