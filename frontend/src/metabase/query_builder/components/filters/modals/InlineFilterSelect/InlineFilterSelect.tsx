import React from "react";
import { t } from "ttag";

import Filter from "metabase-lib/lib/queries/structured/Filter";
import Dimension from "metabase-lib/lib/Dimension";

import RangePicker from "metabase/query_builder/components/filters/pickers/RangePicker";
import { BooleanPickerCheckbox } from "metabase/query_builder/components/filters/pickers/BooleanPicker";

import Warnings from "metabase/query_builder/components/Warnings";

export interface InlineFilterSelectProps {
  fieldType: string;
  filter: Filter;
  dimension: Dimension;
  handleChange: (filter: Filter) => void;
}

export const InlineFilterSelect = ({
  fieldType,
  filter,
  dimension,
  handleChange,
}: InlineFilterSelectProps): JSX.Element => {
  switch (fieldType) {
    case "type/Boolean":
      return (
        <BooleanPickerCheckbox filter={filter} onFilterChange={handleChange} />
      );
    case "type/Float":
    case "type/Integer":
      return (
        <RangePicker
          filter={filter}
          onFilterChange={handleChange}
          dimension={dimension}
        />
      );
    default:
      return <Warnings warnings={[t`Invalid field type`]} />;
  }
};
