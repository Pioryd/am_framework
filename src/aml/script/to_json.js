const stringify = require("json-stringify-safe");
const { Util } = require("../../util");

function get_instruction_source(start_index, lines) {
  const get_indent_level = function (line) {
    let spaces = 0;
    for (let i = 0; i < line.length; i++) {
      if (line.charAt(i) === " ") spaces++;
      else break;
    }

    return Math.floor(spaces / 2);
  };

  let index = start_index;
  let instruction;
  const instruction_index_list = [];
  let start_indent_level = null;

  while (index < lines.length) {
    let line = lines[index];
    const current_index_level = get_indent_level(line);

    if (line.charAt(line.length - 1) === "\\") {
      line = line.trimLeft();
      line = line.substring(0, line.length - 1);
    } else {
      line = line.trim();
    }

    if (start_indent_level == null) {
      start_indent_level = current_index_level;
      instruction = line;
      instruction_index_list.push(index);
    } else if (current_index_level - start_indent_level === 2) {
      instruction += line;
      instruction_index_list.push(index);
    } else {
      break;
    }

    index++;
  }

  instruction = instruction.trim();

  const words = instruction.split(" ");
  const first_word = words[0] != null ? words[0].trim() : words[0];

  return {
    index_list: instruction_index_list,
    indent_level: start_indent_level,
    source: instruction,
    type: first_word
  };
}

function parse_header(start_index, lines) {
  const parsed_header = { data: {} };

  const header_data_found = {
    data: false,
    name: false
  };

  let index = start_index;
  while (index < lines.length) {
    const { index_list, indent_level, source } = get_instruction_source(
      index,
      lines
    );
    const words = source.split(" ");
    const first_word = words[0] != null ? words[0].trim() : words[0];

    if (words.length !== 0 && first_word in header_data_found) {
      const value = source.replace(first_word, "").trim();
      header_data_found[first_word] = true;
      parsed_header[first_word] = value;
    }

    if (index_list.length === 0 || index_list[index_list.length - 1] === -1)
      break;

    // Iterate loop
    index = index_list[index_list.length - 1] + 1;

    if (header_data_found.data !== false) break;
  }

  for (const [name, found] of Object.entries(header_data_found))
    if (found === false) throw new Error(`Not found header key[${name}].`);

  eval(`parsed_header.data = {${parsed_header.data}}`);

  if (parsed_header.name === "") throw new Error("No script name");

  if (index >= lines.length)
    throw new Error(`Not found instructions while parse header.`);

  return { instructions_start_index: index, parsed_header };
}

function parse_api_source(source) {
  source = source.trim();
  if (source.length === 0) return;

  const parsed = {};

  // Find parameters and api name
  const splitted = source.replace(/  +/g, " ").split(" ");

  for (const index of [0, 2])
    if (["-t", "-r"].includes(splitted[0]))
      parsed[splitted[index] === "-t" ? "timeout" : "return"] = splitted[
        index + 1
      ].trim();

  let api_index = 0;
  if (parsed.return != null) api_index += 2;
  if (parsed.timeout != null) api_index += 2;
  parsed.api = splitted[api_index].trim();

  // Get only args source

  //  return_value_name can be same as api
  let args_index = 0;
  if (parsed.return != null)
    args_index =
      source.indexOf(parsed.return, args_index) + parsed.return.length;
  args_index = source.indexOf(parsed.api, args_index) + parsed.api.length;

  parsed.args = source.substr(args_index).trim();

  try {
    eval(`const check_args = ()=>{return {${parsed.args}};}`);
  } catch (e) {
    throw new Error(
      `Wrong arguments format of API[${parsed.api}] Args[${parsed.args}].`
    );
  }

  return parsed;
}

function parse_source(source) {
  let parsed_source = {};
  const words = source.trim().split(" ");
  const instruction_type = words[0] != null ? words[0].trim() : words[0];

  const instruction_body = source.replace(instruction_type, "").trim();

  if (instruction_type === "js") {
    parsed_source = { type: instruction_type, body: instruction_body };
  } else if (
    ["label", "goto", "sleep", "continue", "break"].includes(instruction_type)
  ) {
    parsed_source = { type: "internal", command: source };
  } else if (
    ["if", "elif", "else", "for", "while"].includes(instruction_type)
  ) {
    parsed_source = { type: instruction_type, condition: instruction_body };
  } else if (instruction_type === "api") {
    parsed_source = {
      ...parse_api_source(instruction_body),
      type: instruction_type
    };
  } else {
    throw new Error(`Unknown type. Unable to parse source[${source}].`);
  }

  return parsed_source;
}

function merge_if_statements(parsed_instructions_list) {
  const merge = (list) => {
    const statement_if_merger = {
      _current_if_object: null,
      _current_elif_object_list: [],
      handle: function (object, parent_list) {
        try {
          if (object.type === "if") {
            this._close_if_statement(parent_list);

            object.conditions = {};
            object.conditions[`${object.condition}`] = [...object.instructions];

            delete object.condition;
            delete object.instructions;

            this._current_if_object = object;
            this._current_elif_object_list = [];
          } else if (["elif", "else"].includes(object.type)) {
            const condition = object.type === "elif" ? object.condition : "";
            this._current_if_object.conditions[condition] = [
              ...object.instructions
            ];
            this._current_elif_object_list.push(object);
          }
        } catch (e) {
          throw new Error(
            `Unable to merge object[${stringify(object, null, 2)}` +
              `\n${e.stack}\n${e.message}`
          );
        }
      },
      _close_if_statement: function (parent_list) {
        for (let i = parent_list.length - 1; i >= 0; i--)
          if (this._current_elif_object_list.includes(parent_list[i]))
            parent_list.splice(i, 1);
        this._current_if_object = null;
        this._current_elif_object_list = [];
      }
    };

    for (const object of list) {
      if ("instructions" in object) merge(object["instructions"]);
      statement_if_merger.handle(object, list);
    }

    // When there is not next "IF"
    statement_if_merger._close_if_statement(list);
  };

  merge(parsed_instructions_list);
}

function parse_instructions(start_index, lines) {
  const instructions_info = {
    _info_list: [],
    get: function (object) {
      for (const info of this._info_list)
        if (info.object === object) return info.data;
    },
    set: function (object, data) {
      if (this.get(object) == null) this._info_list.push({ object, data });
    }
  };
  const root_scope = { id: 0, type: "scope", instructions: [] };
  let current_root_instruction = root_scope;
  let index = start_index;

  instructions_info.set(current_root_instruction, {
    index_list: [],
    indent_level: -1
  });

  while (index < lines.length) {
    const instruction_data = get_instruction_source(index, lines);
    index =
      instruction_data.index_list[instruction_data.index_list.length - 1] + 1;

    if (instruction_data.source === "") continue;

    if (
      instruction_data.indent_level ===
      instructions_info.get(current_root_instruction).indent_level
    ) {
      current_root_instruction = instructions_info.get(current_root_instruction)
        .parent;
    } else if (
      instruction_data.indent_level <
      instructions_info.get(current_root_instruction).indent_level
    ) {
      while (
        instruction_data.indent_level <
        instructions_info.get(current_root_instruction).indent_level
      )
        current_root_instruction = instructions_info.get(
          current_root_instruction
        ).parent;
    }

    const scopes_list = ["if", "while", "for", "elif", "else"];
    const instruction = {
      id: instruction_data.index_list[0] + 1,
      ...parse_source(instruction_data.source)
    };

    if (scopes_list.includes(instruction_data.type))
      instruction.instructions = [];

    instructions_info.set(instruction, instruction_data);

    while (
      instructions_info.get(instruction).indent_level <=
      instructions_info.get(current_root_instruction).indent_level
    )
      current_root_instruction = instructions_info.get(current_root_instruction)
        .parent;

    current_root_instruction.instructions.push(instruction);
    instructions_info.get(instruction).parent = current_root_instruction;

    if (scopes_list.includes(instruction_data.type))
      current_root_instruction = instruction;
  }

  merge_if_statements(root_scope.instructions);

  return { root_scope };
}

module.exports = (id, source) => {
  const lines = source.split("\r\n");
  const header_start_index = 0;

  const { instructions_start_index, parsed_header } = parse_header(
    header_start_index,
    lines
  );

  const { root_scope } = parse_instructions(instructions_start_index, lines);

  return { id, ...parsed_header, root_scope };
};
