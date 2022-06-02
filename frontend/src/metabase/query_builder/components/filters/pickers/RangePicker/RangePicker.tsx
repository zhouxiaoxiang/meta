import React, { useCallback, useMemo, ChangeEvent } from "react";
import _ from "underscore";
import { t } from "ttag";

import Filter from "metabase-lib/lib/queries/structured/Filter";
import Slider from "metabase/core/components/Slider";

import { RangeContainer, RangeNumberInput } from "./RangePicker.styled";

interface RangePickerProps {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  className?: string;
}

function RangePicker({ className, filter, onFilterChange }: RangePickerProps) {
  const values = useMemo(() => getValues(filter), [filter]);
  console.log(filter);

  const updateFilter = useCallback(
    (newValue: number[]) => {
      onFilterChange(filter.setOperator("between").setArguments(newValue));
    },
    [filter, onFilterChange],
  );

  return (
    <RangeContainer className={className}>
      <RangeInput
        placeholder={t`min`}
        value={values[0]}
        onChange={value => updateFilter([value, values[1]])}
      />
      <Slider
        min={0}
        max={100}
        step={1}
        value={values}
        onChange={updateFilter}
      />
      <RangeInput
        placeholder={t`max`}
        value={values[1]}
        onChange={value => updateFilter([values[0], value])}
      />
    </RangeContainer>
  );
}

function getValues(filter: Filter) {
  const operatorName = filter.operatorName();
  if (operatorName === "between") {
    return filter.arguments();
  } else {
    return [0, 100];
  }
}

interface RangeInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder: string;
}

const RangeInput = ({ value, onChange, placeholder }: RangeInputProps) => {
  return (
    <RangeNumberInput
      size="small"
      rightIcon="close"
      placeholder={placeholder}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(Number(e.target.value))
      }
      onRightIconClick={() => onChange(undefined)}
      rightIconTooltip={t`Clear`}
      fullWidth
    />
  );
};

export default RangePicker;
