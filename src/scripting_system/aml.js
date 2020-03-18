const ObjectID = require("bson-objectid");
const stringify = require("json-stringify-safe");
const { Util } = require("../util");

function get_indent_level(line) {
  let spaces = 0;
  for (let i = 0; i < line.length; i++) {
    if (line.charAt(i) === " ") spaces++;
    else break;
  }

  return Math.floor(spaces / 2);
}

function get_instruction_source(start_index, lines) {
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
  const parsed_header = { id: ObjectID().toHexString(), name: "", data: {} };

  const header_data_found = {
    id: false,
    name: false,
    data: false
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

    if (
      header_data_found.id !== false &&
      header_data_found.name !== false &&
      header_data_found.data !== false
    )
      break;
  }

  if (
    header_data_found.id === false ||
    header_data_found.name === false ||
    header_data_found.data === false
  )
    throw new Error(`Not found header data. [${header_data_found}]`);

  if (index >= lines.length)
    throw new Error(`Not found instructions while parse header.`);

  return { instructions_start_index: index, parsed_header };
}

function parse_instructions(start_index, lines) {
  const parsed_instructions = {
    root_scope: {
      type: "scope",
      id: ObjectID().toHexString(),
      instructions: []
    }
  };
  const instructions_info = {
    _instruction_info_list: [],
    _get_instruction_info: function(instruction) {
      for (const instruction_info of this._instruction_info_list)
        if (instruction_info.instruction === instruction)
          return instruction_info;
    },
    add_instruction: function(instruction) {
      if (this._get_instruction_info(instruction) == null)
        this._instruction_info_list.push({ instruction });
    },
    add_parent: function(instruction, parent) {
      const instruction_info = this._get_instruction_info(instruction);
      if (instruction_info) instruction_info.parent = parent;
    },
    get_parent: function(instruction) {
      const instruction_info = this._get_instruction_info(instruction);
      if (
        instruction_info != null &&
        instruction_info.instruction === instruction
      )
        return instruction_info.parent;
    }
  };
  const instructions_list = [
    { index_list: [], indent_level: -1, source: "", instructions: [] }
  ];
  let current_root_instruction = instructions_list[0];
  let index = start_index;

  instructions_info.add_instruction(current_root_instruction);

  while (index < lines.length) {
    const instruction_data = get_instruction_source(index, lines);

    if (instruction_data.source !== "") {
      if (
        instruction_data.indent_level === current_root_instruction.indent_level
      ) {
        current_root_instruction = instructions_info.get_parent(
          current_root_instruction
        );
      } else if (
        instruction_data.indent_level < current_root_instruction.indent_level
      ) {
        while (
          instruction_data.indent_level < current_root_instruction.indent_level
        )
          current_root_instruction = instructions_info.get_parent(
            current_root_instruction
          );
      }

      const instruction = {
        ...instruction_data,
        instructions: []
      };

      instructions_info.add_instruction(instruction);

      if (["if", "while", "for"].includes(instruction_data.type)) {
        current_root_instruction.instructions.push(instruction);
        instructions_info.add_parent(instruction, current_root_instruction);
        current_root_instruction = instruction;
      } else if (["elif", "else"].includes(instruction_data.type)) {
        while (
          instruction.indent_level <= current_root_instruction.indent_level
        )
          current_root_instruction = instructions_info.get_parent(
            current_root_instruction
          );
        current_root_instruction.instructions.push(instruction);
        instructions_info.add_parent(instruction, current_root_instruction);

        current_root_instruction = instruction;
      } else {
        current_root_instruction.instructions.push(instruction);

        instructions_info.add_parent(instruction, current_root_instruction);
      }
    }

    index =
      instruction_data.index_list[instruction_data.index_list.length - 1] + 1;
  }

  Util.write_to_json(
    "aml_parsed_log.json",
    JSON.parse(stringify(instructions_list))
  );

  // Create parsed instructions format (JSON - script)

  Util.write_to_json(
    "aml_parsed_instructions.json",
    JSON.parse(stringify(parsed_instructions))
  );

  return { parsed_instructions };
}

module.exports = {
  parse: source => {
    const lines = source.split("\r\n");
    const header_start_index = 0;

    const { instructions_start_index, parsed_header } = parse_header(
      header_start_index,
      lines
    );

    const { parsed_instructions } = parse_instructions(
      instructions_start_index,
      lines
    );

    return { ...parsed_header, ...parsed_instructions };
  },
  validate: () => {}
};
