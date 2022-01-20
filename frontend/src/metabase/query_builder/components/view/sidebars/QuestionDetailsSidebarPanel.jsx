import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { t } from "ttag";

import LastEditInfo from "metabase/components/LastEditInfo";
import {
  onOpenQuestionHistory,
  onCloseQuestionHistory,
} from "metabase/query_builder/actions";
import QuestionActionButtons from "metabase/query_builder/components/QuestionActionButtons";
import { ClampedDescription } from "metabase/query_builder/components/ClampedDescription";
import QuestionActivityTimeline from "metabase/query_builder/components/QuestionActivityTimeline";
import { getQuestionDetailsTimelineDrawerState } from "metabase/query_builder/selectors";
import { STATES as DRAWER_STATES } from "metabase/components/DrawerSection/DrawerSection";

import { PLUGIN_MODERATION } from "metabase/plugins";

import {
  Container,
  BorderedSectionContainer,
  SidebarPaddedContent,
  LastEditInfoButton,
} from "./QuestionDetailsSidebarPanel.styled";
import DatasetManagementSection from "./DatasetManagementSection";
import QuestionDataSource from "./QuestionDataSource";

QuestionDetailsSidebarPanel.propTypes = {
  question: PropTypes.object.isRequired,
  onOpenModal: PropTypes.func.isRequired,
  onOpenQuestionHistory: PropTypes.func,
  onCloseQuestionHistory: PropTypes.func,
  drawerState: PropTypes.oneOf([DRAWER_STATES.open, DRAWER_STATES.closed]),
};

const mapStateToProps = (state, props) => ({
  drawerState: getQuestionDetailsTimelineDrawerState(state, props),
});

const mapDispatchToProps = {
  onOpenQuestionHistory,
  onCloseQuestionHistory,
};

function QuestionDetailsSidebarPanel({
  question,
  drawerState,
  onOpenModal,
  onOpenQuestionHistory,
  onCloseQuestionHistory,
}) {
  const isDataset = question.isDataset();
  const canWrite = question.canWrite();
  const description = question.description();
  const lastEditInfo = question.lastEditInfo();

  const onDescriptionEdit = canWrite
    ? () => {
        onOpenModal("edit");
      }
    : undefined;

  const onDrawerStateChange = () => {
    if (drawerState === DRAWER_STATES.open) {
      onCloseQuestionHistory();
    } else {
      onOpenQuestionHistory();
    }
  };

  return (
    <Container>
      <SidebarPaddedContent>
        <QuestionActionButtons
          canWrite={canWrite}
          isDataset={question.isDataset()}
          onOpenModal={onOpenModal}
        />
        <ClampedDescription
          visibleLines={8}
          description={description}
          onEdit={onDescriptionEdit}
        />
        <BorderedSectionContainer>
          {isDataset && canWrite && (
            <DatasetManagementSection dataset={question} />
          )}
          <PLUGIN_MODERATION.QuestionModerationSection question={question} />
        </BorderedSectionContainer>
        <BorderedSectionContainer>
          <h3 className="text-medium">{t`Backing data`}</h3>
          <QuestionDataSource
            question={question}
            data-metabase-event={`Question Data Source Click`}
          />
        </BorderedSectionContainer>
        {lastEditInfo && (
          <BorderedSectionContainer>
            <LastEditInfoButton
              className="text-paragraph"
              onClick={onDrawerStateChange}
            >
              <LastEditInfo item={question.card()} />
            </LastEditInfoButton>
          </BorderedSectionContainer>
        )}
      </SidebarPaddedContent>
      <QuestionActivityTimeline question={question} />
    </Container>
  );
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(QuestionDetailsSidebarPanel);
