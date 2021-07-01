import React from "react";

import "@testing-library/jest-dom/extend-expect";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ActionButton from "metabase/components/ActionButton";

describe("ActionButton", () => {
  let successAction;
  let failAction;
  let pendingAction;

  beforeEach(() => {
    jest.useFakeTimers();

    successAction = jest.fn().mockReturnValue(
      new Promise(resolve => {
        setTimeout(resolve, 1000);
      }),
    );

    failAction = jest.fn().mockReturnValue(
      new Promise((resolve, reject) => {
        setTimeout(reject, 1000);
      }),
    );
  });

  it("should render a button", () => {
    render(<ActionButton actionFn={successAction} />);
    screen.getByText("Save");
  });

  describe("given an actionFn that eventually succeeds", () => {
    it("should reflect status of action in button text", () => {
      render(<ActionButton actionFn={successAction} />);

      const button = screen.getByText("Save");
      // userEvent.click(button);
      button.click();
      // jest.runTimersToTime(1000);
      // act(() => {
      // });
      // screen.getByText("Saved");

      // button.click();

      // screen.getByText("Saving...");

      // // await jest.runTimersByTime(1001);
      // // jest.runAllTimers();

      // screen.getByText("Saved");

      // // await jest.runAllTimers();
      // screen.getByText("Save");
    });
  });

  // jest.runTimersToTime(interval);
  // describe("and the text is less than the height of the container", () => {
  //     render(<ClampedText visibleLines={1} text={TEXT} />);
  //   it("should not show a toggle", () => {
  //     expect(() => {
  //       screen.getByText(SEE_MORE);
  //     }).toThrow();
  //     expect(() => {
  //       screen.getByText(SEE_LESS);
  //     }).toThrow();
  //   });
  // });
});
