import React, { useCallback, useEffect } from "react";
import { useAsyncFn } from "react-use";
import { jt, t } from "ttag";
import { MetabotApi } from "metabase/services";
import { User } from "metabase-types/api";
import { fillQuestionTemplateTags } from "metabase/metabot/utils/question";
import Question from "metabase-lib/Question";
import Database from "metabase-lib/metadata/Database";
import DatabasePicker from "../DatabasePicker/DatabasePicker";
import MetabotMessage from "../MetabotMessage";
import MetabotPrompt from "../MetabotPrompt";
import MetabotQueryBuilder from "../MetabotQueryBuilder";
import { MetabotHeader, MetabotRoot } from "../MetabotLayout";
import MetabotResultsWrapper from "../MetabotResultsWrapper";

interface DatabaseMetabotProps {
  database: Database;
  databases: Database[];
  user?: User;
  initialQuery?: string;
  onDatabaseChange: (databaseId: number) => void;
}

const DatabaseMetabot = ({
  database,
  databases,
  user,
  initialQuery,
  onDatabaseChange,
}: DatabaseMetabotProps) => {
  const [{ loading, value, error }, run] = useAsyncFn(getQuestionAndResults);

  const handleRun = useCallback(
    (query: string) => {
      run(database, query);
    },
    [database, run],
  );

  useEffect(() => {
    if (initialQuery) {
      run(database, initialQuery);
    }
  }, [database, initialQuery, run]);

  return (
    <MetabotRoot>
      <MetabotHeader>
        <MetabotMessage>
          {getGreetingMessage(databases, onDatabaseChange, database, user)}
        </MetabotMessage>
        <MetabotPrompt
          user={user}
          placeholder={t`Ask something...`}
          initialQuery={initialQuery}
          isRunning={loading}
          onRun={handleRun}
        />
      </MetabotHeader>
      <MetabotResultsWrapper loading={loading} error={error} data={value}>
        {({ question, results }) => (
          <MetabotQueryBuilder question={question} results={results} />
        )}
      </MetabotResultsWrapper>
    </MetabotRoot>
  );
};

const getGreetingMessage = (
  databases: Database[],
  onDatabaseChange: (databaseId: number) => void,
  database: Database,
  user?: User,
) => {
  const name = user?.first_name;
  const databasePicker = (
    <DatabasePicker
      databases={databases}
      selectedDatabaseId={database.id}
      onChange={onDatabaseChange}
    />
  );

  return name
    ? jt`What do you want to know about ${databasePicker}, ${name}?`
    : jt`What do you want to know about ${databasePicker}?`;
};

const getQuestionAndResults = async (database: Database, query: string) => {
  const card = await MetabotApi.databasePrompt({
    databaseId: database.id,
    question: query,
  });
  const question = fillQuestionTemplateTags(
    new Question(card, database.metadata),
  );

  const results = await question.apiGetResults();

  return { question: question, results };
};

export default DatabaseMetabot;
