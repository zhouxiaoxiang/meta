import React from "react";
import PropTypes from "prop-types";
import styled from "@emotion/styled";
import { color } from "metabase/lib/colors";
import { space } from "metabase/styled-components/theme";

import Input from "metabase/core/components/Input";

export const RangeContainer = styled.div`
  display: flex;
  align-items: center;
  width: 576px;
  margin: ${space(1)} 0;
`;

export const RangeNumberInput = styled(Input)`
  width: 8rem;
`;
