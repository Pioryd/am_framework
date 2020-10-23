const { expect } = require("chai");
const { Stopwatch } = require("../src/stopwatch");

describe("Stopwatch", () => {
  it("countdown_time", () => {
    const stopwatch = new Stopwatch(0);

    {
      const start = new Date();
      expect(stopwatch.is_elapsed()).to.be.false;
      while (new Date() - start < 1) {}
      expect(stopwatch.is_elapsed()).to.be.true;
    }
    {
      stopwatch.reset(-1);
      expect(stopwatch.is_elapsed()).to.be.true;
    }
  });
  it("precision", () => {
    const stopwatch = new Stopwatch(5);

    const start = new Date();
    expect(stopwatch.is_elapsed()).to.be.false;
    while (new Date() - start < 6) {}
    expect(stopwatch.is_elapsed()).to.be.true;
  });
});
