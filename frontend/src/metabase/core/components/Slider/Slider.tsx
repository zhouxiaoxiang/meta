import React, {
  ChangeEvent,
  InputHTMLAttributes,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";

import {
  SliderContainer,
  SliderInput,
  SliderTooltip,
  SliderTrack,
  ActiveTrack,
} from "./Slider.styled";

export type NumericInputAttributes = Omit<
  InputHTMLAttributes<HTMLDivElement>,
  "value" | "size" | "onChange"
>;

export interface SliderProps extends NumericInputAttributes {
  value: number[];
  onChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = ({
  value: parentValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: SliderProps) => {
  const [value, setValue] = useState(parentValue || [min, max]);
  const [isDragging, setIsDragging] = useState(false);

  const [rangeMin, rangeMax] = useMemo(
    () => [Math.min(...value, min, max), Math.max(...value, min, max)],
    [value, min, max],
  );

  useEffect(() => {
    setValue(parentValue || [min, max]);
  }, [parentValue, min, max]);

  const [beforeRange, rangeWidth] = useMemo(() => {
    const totalRange = rangeMax - rangeMin;

    return [
      ((Math.min(...value) - rangeMin) / totalRange) * 100,
      (Math.abs(value[1] - value[0]) / totalRange) * 100,
    ];
  }, [value, rangeMin, rangeMax]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, valueIndex: number) => {
      const changedValue = [...value];
      changedValue[valueIndex] = Number(event.target.value);
      setValue(changedValue);
    },
    [value, setValue],
  );

  const sortValues = useCallback(() => {
    const sortedValues = value[1] < value[0] ? [...value].sort() : value;

    onChange(sortedValues);
  }, [value, onChange]);

  return (
    <SliderContainer>
      <SliderTrack />
      <ActiveTrack
        style={{ left: `${beforeRange}%`, width: `${rangeWidth}%` }}
      />
      <SliderTooltip
        style={{
          left: getTooltipPosition(beforeRange),
          opacity: isDragging ? 1 : 0,
        }}
      >
        {Math.min(...value)}
      </SliderTooltip>
      <SliderInput
        type="range"
        aria-label="min"
        value={value[0]}
        onChange={e => handleChange(e, 0)}
        onMouseEnter={() => setIsDragging(true)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={sortValues}
        min={rangeMin}
        max={rangeMax}
        step={step}
      />
      <SliderTooltip
        style={{
          left: getTooltipPosition(beforeRange + rangeWidth),
          opacity: isDragging ? 1 : 0,
        }}
      >
        {Math.max(...value)}
      </SliderTooltip>
      <SliderInput
        type="range"
        aria-label="max"
        value={value[1]}
        onChange={e => handleChange(e, 1)}
        onMouseUp={sortValues}
        onMouseEnter={() => setIsDragging(true)}
        onMouseLeave={() => setIsDragging(false)}
        min={rangeMin}
        max={rangeMax}
        step={step}
      />
    </SliderContainer>
  );
};

const getTooltipPosition = (basePosition: number) =>
  `calc(${basePosition}% + ${11 - basePosition * 0.18}px)`;

export default Slider;
