const { expect } = require("chai");
const { Stopper } = require("../src/stopper");

describe("Stopper", () => {
  it("All", () => {
    const stopper = new Stopper(0);

    expect(stopper.start_time, 0).to.be.equal;
    expect(stopper.diff_time, 0).to.be.equal;

    const start = new Date();
    stopper.start();
    while (new Date() - start < 20) {}
    stopper.stop();
    expect(stopper.get_elapsed_milliseconds() >= 20).to.be.true;
    expect(stopper.get_elapsed_milliseconds() <= 21).to.be.true;
  });
});
