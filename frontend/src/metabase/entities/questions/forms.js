import React from "react";
import { t, jt } from "ttag";

import ExternalLink from "metabase/core/components/ExternalLink";

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

function getModelCachingField() {
  const docsLink = (
    <ExternalLink
      key="model-docs-link"
      href={MetabaseSettings.docsUrl("users-guide/models")}
    >{t`Learn more`}</ExternalLink>
  );

  return {
    name: "persisted",
    title: t`Cache`,
    description: jt`Enabling caching will create tables for your models in a dedicated schema and Metabase will refresh them on a schedule. ${docsLink}.`,
    type: "boolean",
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
  editModel: {
    fields: () => [...getCommonFormFields(), getModelCachingField()],
  },
};
