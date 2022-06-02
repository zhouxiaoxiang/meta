import React, {
  useCallback,
  useMemo,
  ChangeEvent,
  useState,
  useEffect,
} from "react";
import _ from "underscore";
import { t } from "ttag";

import Filter from "metabase-lib/lib/queries/structured/Filter";
import Slider from "metabase/core/components/Slider";
import Dimension from "metabase-lib/lib/Dimension";

import { RangeContainer, RangeNumberInput } from "./RangePicker.styled";

interface RangePickerProps {
  filter: Filter;
  dimension: Dimension;
  onFilterChange: (filter: Filter) => void;
  className?: string;
}

function RangePicker({
  className,
  filter,
  onFilterChange,
  dimension,
}: RangePickerProps) {
  const [fieldMin, fieldMax] = useMemo(() => {
    const fingerprint = dimension?.field()?.fingerprint?.type?.["type/Number"];

    if (!fingerprint) {
      return [0, 100];
    }
    return [fingerprint.min, fingerprint.max];
  }, [dimension]);

  const [rangeMin, setRangeMin] = useState(fieldMin);
  const [rangeMax, setRangeMax] = useState(fieldMax);
  const values = useMemo(() => getValues(filter), [filter]);

  const updateFilter = useCallback(
    (newValue: (number | undefined)[]) => {
      if (!newValue.includes(undefined)) {
        onFilterChange(filter.setOperator("between").setArguments(newValue));
      } else if (newValue[0] === undefined) {
        onFilterChange(filter.setOperator("lt").setArguments(newValue[1]));
      } else if (newValue[1] === undefined) {
        onFilterChange(filter.setOperator("gt").setArguments(newValue[0]));
      }
    },
    [filter, onFilterChange],
  );

  useEffect(() => {
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    if (minValue < rangeMin) {
      setRangeMin(minValue);
    }
    if (maxValue > rangeMax) {
      setRangeMax(maxValue);
    }
  }, [dimension, values, rangeMin, rangeMax]);

  return (
    <RangeContainer className={className}>
      <RangeInput
        placeholder={t`min`}
        value={values[0]}
        onChange={value => updateFilter([value, values[1]])}
      />
      <Slider
        min={rangeMin}
        max={rangeMax}
        step={1}
        value={[values[0] ?? rangeMin, values[1] ?? rangeMax]}
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
    return [undefined, undefined];
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
