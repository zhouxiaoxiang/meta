import React, { useCallback, useMemo } from "react";
import { t } from "ttag";
import _ from "underscore";

import RootForm from "metabase/containers/Form";

import Questions from "metabase/entities/questions";
import Question from "metabase-lib/lib/Question";

import {
  SettingsRoot,
  SettingsFormCard,
  SettingsFormTitle,
} from "./DatasetEditor.styled";

type Props = {
  dataset: Question;
  onChange: (field: string, value: unknown) => void;
};

type FormRenderProps = {
  Form: React.ComponentType;
  FormField: React.ComponentType<{
    name: string;
    onChange?: React.ChangeEventHandler;
  }>;
};

function ModelEditorSettings({ dataset, onChange }: Props) {
  const initialValues = useMemo(
    () => ({
      name: dataset.displayName(),
      description: dataset.description(),
      persisted: dataset.isPersisted(),
    }),
    [dataset],
  );

  const onChangeDebounced = useMemo(() => _.debounce(onChange, 300), [
    onChange,
  ]);

  const onChangeName = useCallback(
    e => {
      onChangeDebounced("name", e.target.value);
    },
    [onChangeDebounced],
  );

  const onChangeDescription = useCallback(
    e => {
      onChangeDebounced("description", e.target.value);
    },
    [onChangeDebounced],
  );

  const onToggleCaching = useCallback(
    value => {
      onChange("persisted", value);
    },
    [onChange],
  );

  return (
    <SettingsRoot>
      <SettingsFormCard>
        <SettingsFormTitle>{t`Edit details`}</SettingsFormTitle>
        <RootForm
          form={Questions.forms.editModel}
          initialValues={initialValues}
        >
          {({ Form, FormField }: FormRenderProps) => (
            <Form>
              <FormField name="name" onChange={onChangeName} />
              <FormField name="description" onChange={onChangeDescription} />
              <FormField name="persisted" onChange={onToggleCaching} />
            </Form>
          )}
        </RootForm>
      </SettingsFormCard>
    </SettingsRoot>
  );
}

export default ModelEditorSettings;
