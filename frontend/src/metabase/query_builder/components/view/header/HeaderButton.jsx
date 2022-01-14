import Button from "metabase/components/Button";
import { color, alpha } from "metabase/lib/colors";

import styled from "styled-components";

// NOTE: some of this is duplicated from NotebookCell.jsx
const ViewButton = styled(Button)`
  background-color: ${({ active, color = getDefaultColor() }) =>
    active ? alpha(color, 0.8) : "transparent"};
  color: ${({ active }) =>
    active ? "white" : color("text-dark")};
  &:hover {
    background-color: ${({ active, color = getDefaultColor() }) =>
      active ? alpha(color, 0.8) : "transparent"};
    color: ${({ active }) =>
      active ? "white" : color("text-dark")};
  }
  transition: background 300ms linear, border 300ms linear;
  > .Icon {
    opacity: 0.6;
  }
`;

const getDefaultColor = () => color("brand");

export default ViewButton;
