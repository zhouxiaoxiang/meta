/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";

import InputBlurChange from "metabase/components/InputBlurChange";
import cx from "classnames";

const SettingInput = ({
  setting,
  onChange,
  disabled,
  autoFocus,
  errorMessage,
  fireOnChange,
  id,
  type = "text",
}) => {
  const [localInput, setLocalInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = e => {
    onChange(e.target.value);
    setLocalInput(e.target.value);
  };

  useEffect(() => {
    setIsDirty(setting.value === localInput);
  }, [setting.value, localInput]);

  const hidePasswordValue = type === "password" && !isDirty && setting.value;

  return (
    <InputBlurChange
      className={cx("Form-input", {
        SettingsInput: type !== "password",
        SettingsPassword: type === "password",
        "border-error bg-error-input": errorMessage,
      })}
      id={id}
      type={type}
      value={hidePasswordValue ? "" : setting.value || ""}
      placeholder={hidePasswordValue ? setting.value : setting.placeholder}
      onChange={fireOnChange ? handleChange : null}
      onBlurChange={!fireOnChange ? e => handleChange : null}
      autoFocus={autoFocus}
    />
  );
};

export default SettingInput;
