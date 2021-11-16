import { compile } from "metabase/lib/expressions/custom/compiler";
import { lexify, parse } from "metabase/lib/expressions/custom/parser";

describe("metabase/lib/expressions/compiler", () => {
  function expr(source: string, throwOnError: boolean = true) {
    try {
      return compile(
        parse(lexify(source), {
          throwOnError,
        }).root,
      );
    } catch (err) {
      // Helps get the error value in wallaby/quokka
      throw err; //?
    }
  }

  describe("(for an expression)", () => {
    it("should compile literals", () => {
      expect(expr("42")).toEqual(42);
      expect(expr("'Universe'")).toEqual("Universe");
    });
    it("should compile dimensions", () => {
      expect(expr("[Price]")).toEqual(["dimension", "Price"]);
      expect(expr("([X])")).toEqual(["dimension", "X"]);
    });
    it("should compile arithmetic operations", () => {
      expect(expr("1+2")).toEqual(["+", 1, 2]);
      expect(expr("3-4")).toEqual(["-", 3, 4]);
      expect(expr("5*6")).toEqual(["*", 5, 6]);
      expect(expr("7/8")).toEqual(["/", 7, 8]);
      expect(expr("-(1+2)")).toEqual(["-", ["+", 1, 2]]);
    });
    it("should compile comparisons", () => {
      expect(expr("1<2")).toEqual(["<", 1, 2]);
      expect(expr("3>4")).toEqual([">", 3, 4]);
      expect(expr("5<=6")).toEqual(["<=", 5, 6]);
      expect(expr("7>=8")).toEqual([">=", 7, 8]);
      expect(expr("9=9")).toEqual(["=", 9, 9]);
      expect(expr("9!=0")).toEqual(["!=", 9, 0]);
    });
    it("should logical operators", () => {
      expect(expr("7 or 8")).toEqual(["or", 7, 8]);
      expect(expr("7 and 8")).toEqual(["and", 7, 8]);
      expect(expr("7 and Size")).toEqual(["and", 7, ["dimension", "Size"]]);
      expect(expr("NOT (7 and Size)")).toEqual([
        "not",
        ["and", 7, ["dimension", "Size"]],
      ]);
    });
    it("should handle parenthesized expression", () => {
      expect(expr("(42)")).toEqual(42);
      expect(expr("-42")).toEqual(-42);
      expect(expr("-(42)")).toEqual(["-", 42]);
      expect(expr("((43))")).toEqual(43);
      expect(expr("('Universe')")).toEqual("Universe");
      expect(expr("(('Answer'))")).toEqual("Answer");
      expect(expr("(1+2)")).toEqual(["+", 1, 2]);
      expect(expr("(1+2)/3")).toEqual(["/", ["+", 1, 2], 3]);
      expect(expr("4-(5*6)")).toEqual(["-", 4, ["*", 5, 6]]);
      expect(expr("func_name(5*6, 4-3)")).toEqual([
        "func_name",
        ["*", 5, 6],
        ["-", 4, 3],
      ]);
    });
  });

  describe("Should match the old compiler", () => {
    //               ( NOT  ( NOT  (NOT  " dD")) -(CijXj_3 OR [_ → i2wDlEd]))', () => {
    it('seed 59789:  ( NOT  ( NOT   NOT  " dD" ) - CijXj_3 OR [_ → i2wDlEd])', () => {
      expect(
        expr('( NOT  ( NOT   NOT  " dD" ) -CijXj_3 OR [_ → i2wDlEd])'),
      ).toEqual([
        "or",
        ["not", ["-", ["not", ["not", " dD"]], ["dimension", "CijXj_3"]]],
        ["dimension", "_ → i2wDlEd"],
      ]);
    });

    it("Seed 59793: NOT NOT [p]<0", () => {
      expect(expr("NOT NOT [p] < 0")).toEqual([
        "not",
        ["not", ["<", ["dimension", "p"], 0]],
      ]);
    });

    it("Seed 59809: NOT ( ( [gG9_r]) )  >=( [__] )", () => {
      expect(expr("NOT ( ( [gG9_r]) )  >=( [__] )")).toEqual([
        "not",
        [">=", ["dimension", "gG9_r"], ["dimension", "__"]],
      ]);
    });
  });
});
