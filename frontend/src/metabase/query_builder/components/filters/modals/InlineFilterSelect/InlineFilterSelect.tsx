import React from "react";
import { t } from "ttag";

import Filter from "metabase-lib/lib/queries/structured/Filter";

import BooleanPicker from "metabase/query_builder/components/filters/pickers/BooleanPicker";
import RangePicker from "metabase/query_builder/components/filters/pickers/RangePicker";
import Warnings from "metabase/query_builder/components/Warnings";

export interface InlineFilterSelectProps {
  fieldType: string;
  filter: Filter;
  handleChange: (filter: Filter) => void;
}

export const InlineFilterSelect = ({
  fieldType,
  filter,
  handleChange,
}: InlineFilterSelectProps): JSX.Element => {
  switch (fieldType) {
    case "type/Boolean":
      return (
        <BooleanPicker
          filter={filter}
          onFilterChange={handleChange}
          asCheckBox
        />
      );
    case "type/Float":
    case "type/Integer":
      return <RangePicker filter={filter} onFilterChange={handleChange} />;
    default:
      return <Warnings warnings={[t`Invalid field type`]} />;
  }
};
