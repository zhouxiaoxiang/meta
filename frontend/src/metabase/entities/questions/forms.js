import { t } from "ttag";

import MetabaseSettings from "metabase/lib/settings";
import { PLUGIN_CACHING } from "metabase/plugins";

function getCommonFormFields() {
  return [
    { name: "name", title: t`Name` },
    {
      name: "description",
      title: t`Description`,
      type: "text",
      placeholder: t`It's optional but oh, so helpful`,
    },
  ];
}

function getQuestionCachingField() {
  if (
    !MetabaseSettings.get("enable-query-caching") ||
    !PLUGIN_CACHING.cacheTTLFormField
  ) {
    return null;
  }
  return {
    ...PLUGIN_CACHING.cacheTTLFormField,
    title: t`Caching`,
    type: "questionCacheTTL",
  };
}

export default {
  create: {
    fields: () => [
      ...getCommonFormFields(),
      {
        name: "collection_id",
        title: t`Collection`,
        type: "collection",
      },
    ],
  },
  edit: {
    fields: () =>
      [...getCommonFormFields(), getQuestionCachingField()].filter(Boolean),
  },
};
