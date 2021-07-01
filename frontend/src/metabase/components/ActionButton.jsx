import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { t } from "ttag";
import cx from "classnames";

import { useAsyncFunction } from "metabase/hooks/use-async-function";

import Icon from "metabase/components/Icon";
import Button from "metabase/components/Button";

export default ActionButton;

ActionButton.propTypes = {
  actionFn: PropTypes.func.isRequired,
  className: PropTypes.string,
  successClassName: PropTypes.string,
  failedClassName: PropTypes.string,
  children: PropTypes.node,
  normalText: PropTypes.string,
  activeText: PropTypes.string,
  failedText: PropTypes.string,
  successText: PropTypes.string,
  forceActiveStyle: PropTypes.bool,
};

const SUCCESS = "success";
const FAILED = "failed";

function ActionButton({
  actionFn,
  className = "Button",
  successClassName = "Button--success",
  failedClassName = "Button--danger",
  children,
  normalText = t`Save`,
  activeText = t`Saving...`,
  failedText = t`Save failed`,
  successText = t`Saved`,
  forceActiveStyle = false,
  ...buttonProps
}) {
  const [actionResult, setActionResult] = useState(null);
  const [safeActionFn, isActionFnPending] = useAsyncFunction(actionFn);
  const timeoutRef = useRef(null);

  const resetStateOnTimeout = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActionResult(null);
    }, 5000);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const onClick = useCallback(
    async event => {
      event.preventDefault();
      setActionResult(null);

      try {
        await safeActionFn();
        setActionResult(SUCCESS);
      } catch (error) {
        console.log("AAA", error);
        setActionResult(FAILED);
      }

      resetStateOnTimeout();
    },
    [safeActionFn],
  );

  const isActionDisabled = isActionFnPending || actionResult === SUCCESS;

  let buttonChildren = children || normalText;
  if (isActionFnPending) {
    buttonChildren = activeText;
  } else if (actionResult === FAILED) {
    buttonChildren = failedText;
  } else if (actionResult === SUCCESS) {
    buttonChildren = (
      <span>
        {forceActiveStyle ? null : <Icon name="check" size={12} />}
        <span className="ml1">{successText}</span>
      </span>
    );
  }

  return (
    <Button
      {...buttonProps}
      className={
        forceActiveStyle
          ? "Button Button--waiting"
          : cx(className, {
              "Button--waiting": isActionFnPending,
              [successClassName]: actionResult === SUCCESS,
              [failedClassName]: actionResult === FAILED,
              "pointer-events-none": isActionDisabled,
            })
      }
      onClick={onClick}
    >
      {buttonChildren}
    </Button>
  );
}
