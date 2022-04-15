import React, { useState } from "react";
import PropTypes from "prop-types";

import QuestionDetailsSidebarPanel from "metabase/query_builder/components/view/sidebars/QuestionDetailsSidebarPanel";
import { SIDEBAR_VIEWS } from "./constants";

QuestionDetailsSidebar.propTypes = {
  question: PropTypes.object.isRequired,
  isBookmarked: PropTypes.bool.isRequired,
  setQueryBuilderMode: PropTypes.func.isRequired,
  onOpenModal: PropTypes.func.isRequired,
  toggleBookmark: PropTypes.func.isRequired,
};

function QuestionDetailsSidebar({
  question,
  isBookmarked,
  setQueryBuilderMode,
  onOpenModal,
  toggleBookmark,
}) {
  const [view, setView] = useState(view);

  switch (view) {
    case SIDEBAR_VIEWS.DETAILS:
    default:
      return (
        <QuestionDetailsSidebarPanel
          setView={setView}
          question={question}
          isBookmarked={isBookmarked}
          setQueryBuilderMode={setQueryBuilderMode}
          onOpenModal={onOpenModal}
          toggleBookmark={toggleBookmark}
        />
      );
  }
}

export default QuestionDetailsSidebar;
