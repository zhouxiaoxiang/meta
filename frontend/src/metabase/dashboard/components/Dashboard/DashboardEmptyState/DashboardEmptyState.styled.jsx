import styled from "@emotion/styled";

import { space } from "metabase/styled-components/theme";

export const Container = styled.div`
  box-sizing: border-box;
  text-align: center;
  color: ${({ isNightMode }) => (isNightMode ? "white" : "inherit")};
  margin-top: ${space(4)};
`;
