import ajax from "../../ajax";
import ChainedPromise from "../../lib/ChainedPromise";
import { coreutils } from "../../utils";

module.exports = function ($, { session, execute }) {
  class CalculatePromise extends ChainedPromise {
    constructor(executor = (resolve) => resolve(0)) {
      super(executor);
    }
    add(n) {
      return this.chain(async function (parentResp) {
        // await coreutils.sleep(100);
        console.log(`add ${n}`)
        return parentResp + n;
      });
    }
    substract(n) {
      return this.chain(async function (parentResp) {
        // await coreutils.sleep(100);
        console.log(`subtract ${n}`)
        return parentResp - n;
      });
    }
    multiply(n) {
      return this.chain(async function (parentResp) {
        // await coreutils.sleep(100);
        console.log(`multiply ${n}`)
        return parentResp * n;
      });
    }
  }
  return function (options) {
    return new CalculatePromise().add(options);
  };
};
