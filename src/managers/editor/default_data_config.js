module.exports = {
  am_form: {
    init: { id: "", rules: [], scripts: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string"
              },
              triggers: {
                type: "array"
              },
              actions: {
                type: "array"
              }
            },
            additionalProperties: false
          }
        },
        scripts: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["id", "rules", "scripts"],
      additionalProperties: false
    }
  },
  am_program: {
    init: { id: "", rules: [], forms: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string"
              },
              triggers: {
                type: "array"
              },
              actions: {
                type: "array"
              }
            },
            additionalProperties: false
          }
        },
        forms: {
          type: "array",
          items: {
            type: "string"
          }
        }
      }
    },
    required: ["id", "rules", "forms"],
    additionalProperties: false
  },
  am_system: {
    init: { id: "", programs: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        programs: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["id", "programs"],
      additionalProperties: false
    }
  },
  am_script: { init: { id: "", source: `data\r\n` }, validate: "aml" }
};
